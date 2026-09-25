# App icon

`qbr-icon.svg` is the source for the iOS app icon (v2, simplified): a mini
spreadsheet, centred and straight-on, with Finance's side shaded red on top and yours blue at the bottom, like the game's vertical board. It is a placeholder
until the commissioned pixel-art set exists (see the IP guardrails in the repo's
`CLAUDE.md`: original shapes only, no Excel/Office marks).

The shipped file is
`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`:
one universal 1024x1024 PNG, **no alpha channel** (the App Store rejects icons
with alpha; iOS applies the rounded mask itself).

To re-render after editing the SVG: open it at 1024x1024 in any browser and
screenshot it at device-scale 1 (headless Chrome over CDP works), then strip
alpha with `sips`:

```sh
sips -s format jpeg -s formatOptions 100 icon.png --out /tmp/icon.jpg
sips -s format png /tmp/icon.jpg --out AppIcon-512@2x.png
sips -g hasAlpha AppIcon-512@2x.png   # must print: hasAlpha: no
```
