# Dev VM disk encryption with network-bound auto-unlock

Scope: homelab dev VMs on a 3-node Proxmox + CEPH cluster. UAT/PROD are off site and out of scope.

## Problem

Dev VMs used full-disk encryption (256GB + 512GB images on CEPH, ~2.3TB raw with 3x replication). Every outage meant a manual Dropbear/SSH unlock per VM before anything came back.

## Decision

Split each VM into a small unencrypted OS disk and a LUKS2 data disk auto-unlocked at boot via **Clevis + Tang (NBDE)**. Reachability of the Tang server is the unlock gate: if the VM can reach Tang, the data volume mounts with no interaction; if not, boot still completes and the volume is opened manually.

Rejected: a literal ping-gated keyfile script. A keyfile on the unencrypted OS disk (also on CEPH) means anyone who can read the OS image gets the key — theater, not encryption. Tang avoids this: the VM never holds the key, it receives a decryption only Tang can grant.

## Layout per VM

| Disk | Size | Encryption | Contents |
|---|---|---|---|
| OS (RBD on CEPH) | 80GB | none | OS, docker root incl. build cache (capped, see below) |
| Data (RBD on CEPH) | 48GB | LUKS2 + Tang | `/secure`: repos, sensitive docker volumes |

Build cache is deliberately **not** encrypted — it isn't sensitive and encrypting it would tie dockerd startup to the data mount. Cap it instead (`/etc/docker/daemon.json`):

```json
{
  "builder": {
    "gc": { "enabled": true, "defaultKeepStorage": "20GB" }
  }
}
```

Keep the engine on root, bind-mount only secrets out of LUKS (compose `driver_opts: type: none, o: bind, device: /secure/docker/<name>`), and add `RequiresMountsFor=/secure` to a `docker.service` override. Do not move all of `/var/lib/docker` onto LUKS or dockerd won't start when Tang is down.

Dockerfile hygiene: never `COPY` secrets/`.env` into layers — they'd sit unencrypted in build cache. Use `--mount=type=secret`.

Expected saving: ~2 x (80 + 48)GB x 3 replicas ~= 770GB raw, down from ~2.3TB.

## Tang server

Separate failure domain from the CEPH pool (Pi, NAS container, or LXC on local storage). Must boot unattended — otherwise the outage dance isn't fixed. Single instance is fine for dev.

```bash
apt install tang
systemctl enable --now tangd.socket
tang-show-keys 80   # pin a thumbprint (thp) client-side
```

Back up `/var/db/tang`. Losing these keys with no passphrase slot means losing the data. Key rotation requires rebinding clients (pinned `thp` stops working).

## Guest setup (Debian/Ubuntu)

```bash
apt install clevis clevis-luks clevis-systemd cryptsetup

cryptsetup luksFormat --type luks2 /dev/vdb
cryptsetup open /dev/vdb securedata
mkfs.ext4 -L secure /dev/mapper/securedata

# Tang binding in slot 1; keep a passphrase in slot 0 as recovery
clevis luks bind -d /dev/vdb tang '{"url":"http://<tang-ip>","thp":"<thumbprint>"}'
cryptsetup luksHeaderBackup /dev/vdb --header-backup-file /root/luks-header.bin
# store the header backup + passphrase OFF the VM (password manager / USB)
```

`/etc/crypttab` (`_netdev` defers unlock until the network is up):

```
securedata UUID=<luks-uuid> none _netdev,discard
```

`/etc/fstab` (`nofail` so boot completes when Tang is unreachable):

```
UUID=<fs-uuid>  /secure  ext4  defaults,nofail,x-systemd.device-timeout=30  0 2
/secure/repos   /home/dev/repos                 none  bind,nofail  0 0
/secure/docker  /var/lib/docker/volumes-secure  none  bind,nofail  0 0
```

## Verification (both paths, before migrating data)

1. Tang up: reboot, `/secure` mounts, no prompt.
2. Tang down: reboot still completes, SSH in, unlock manually (`cryptsetup open /dev/vdb securedata`, `mount -a`).
3. Migrate repos + secrets, verify containers, then delete the old FDE VMs and their RBD images.

## Threat model

Protects against disk/RBD theft outside the LAN (dead SSD disposal, snapshot leak). Does not protect against anyone on the LAN or with root on a running VM — if Tang answers them, the disk opens. Accepted tradeoff for dev; this is why UAT/PROD stay off site under stronger controls.
