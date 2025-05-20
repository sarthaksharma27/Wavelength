#!/bin/bash

ROOM_ID=$1

RECORDINGS_DIR=/app/recordings/$ROOM_ID
TEMP_DIR=/app/temp/$ROOM_ID
FINAL_DIR=/app/finals

mkdir -p "$TEMP_DIR"
mkdir -p "$FINAL_DIR"

# Create concat lists for host and guest
ls "$RECORDINGS_DIR/host"/*.webm | sort | sed "s/^/file '/;s/$/'/" > "$TEMP_DIR/host_list.txt"
ls "$RECORDINGS_DIR/guest"/*.webm | sort | sed "s/^/file '/;s/$/'/" > "$TEMP_DIR/guest_list.txt"

# Merge host chunks with audio re-encoding
ffmpeg -f concat -safe 0 -i "$TEMP_DIR/host_list.txt" -c:v libvpx-vp9 -c:a libopus -y "$TEMP_DIR/host_full.webm"

# Merge guest chunks with audio re-encoding
ffmpeg -f concat -safe 0 -i "$TEMP_DIR/guest_list.txt" -c:v libvpx-vp9 -c:a libopus -y "$TEMP_DIR/guest_full.webm"

# Final side-by-side video with audio mix
ffmpeg \
  -i "$TEMP_DIR/host_full.webm" \
  -i "$TEMP_DIR/guest_full.webm" \
  -filter_complex "[0:v]setpts=PTS-STARTPTS,scale=iw/2:ih/2[left]; \
                   [1:v]setpts=PTS-STARTPTS,scale=iw/2:ih/2[right]; \
                   [left][right]hstack=inputs=2[v]; \
                   [0:a]aresample=async=1[a0]; \
                   [1:a]aresample=async=1[a1]; \
                   [a0][a1]amix=inputs=2[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -c:a aac -strict -2 -shortest \
  -y "$FINAL_DIR/${ROOM_ID}.mp4"
