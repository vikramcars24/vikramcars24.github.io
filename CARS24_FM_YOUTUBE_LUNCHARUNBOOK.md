# Cars24 FM YouTube Launch Runbook

This is the handoff note for taking `Cars24 FM` live on the official `Cars24` YouTube channel.

## What Was Confirmed

- Official Cars24 YouTube Studio live control room was reachable.
- Google verification was cleared.
- A live stream page exists in YouTube Studio for Cars24.
- YouTube ingest is ready.
- The website page is not a raw RTMP feed.
- The intended streaming source is the browser-rendered page itself.

## Source Page

Use this as the browser-rendered source inside OBS:

`https://vikramchopra.in/cars24-fm/?v=2&autoplay=1`

The page code explicitly supports this path for browser-source / 24-7 streaming use.

## YouTube Ingest

- Primary server: `rtmp://a.rtmp.youtube.com/live2`
- Backup server: `rtmp://b.rtmp.youtube.com/live2?backup=1`
- Stream key: use the default Cars24 stream key already selected in YouTube Studio

## OBS Setup

1. Open `OBS`.
2. Create a scene: `Cars24 FM Live`.
3. Add a `Browser Source`.
4. URL: `https://vikramchopra.in/cars24-fm/?v=2&autoplay=1`
5. Width: `1280`
6. Height: `720`
7. Ensure browser-source audio is enabled.
8. In `Settings -> Stream`:
   - Use `YouTube - RTMPS` if available, otherwise `Custom`
   - Server: `rtmp://a.rtmp.youtube.com/live2`
   - Stream key: paste the Cars24 key from YouTube Studio
9. In `Settings -> Video`:
   - Base canvas: `1280x720`
   - Output resolution: `1280x720`
   - FPS: `30`
10. Start stream.

## YouTube Metadata

- Title: `Cars24 FM | music for thinking and driving`
- Description: `Cars24 FM: 24/7 music for thinking and driving. Better drives, better lives.`
- Category: `Music`
- Privacy: start with `Unlisted`, move to `Public` after verifying stability

## Thumbnail Guidance

- Use the Cars24 FM visual world from the page
- Dark, premium, night-drive feel
- Main text: `Cars24 FM`
- Optional sub-line: `music for thinking and driving`
- Avoid noisy clickbait styling

## Launch Checklist

- OBS browser source loads and plays
- Audio is audible and clean
- YouTube Studio preview appears
- Connection status is healthy
- Test playback on phone and laptop
- Switch from `Unlisted` to `Public` once stable

## Known Limitation From This Session

Chrome automation on the heavy YouTube Studio edit flow was unstable after auth, so metadata entry was not reliably completed from automation. The remaining edits should be done manually in YouTube Studio when at the desktop.
