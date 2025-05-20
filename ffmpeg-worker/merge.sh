#!/bin/bash
set -e

ROOM_ID=$1
echo "Merging for Room ID: $ROOM_ID"

HOST_DIR="/app/recordings/$ROOM_ID/host"
GUEST_DIR="/app/recordings/$ROOM_ID/guest"
OUTPUT_DIR="/app/finals"
TEMP_DIR="/app/temp"

OUTPUT_FILE="$OUTPUT_DIR/$ROOM_ID.mp4"

# Create file lists for ffmpeg concat
HOST_LIST="$TEMP_DIR/host_list.txt"
GUEST_LIST="$TEMP_DIR/guest_list.txt"

# Prepare the list file format for ffmpeg concat demuxer
for f in "$HOST_DIR"/chunk-*.webm; do echo "file '$f'" >> "$HOST_LIST"; done
for f in "$GUEST_DIR"/chunk-*.webm; do echo "file '$f'" >> "$GUEST_LIST"; done

# Merge host chunks into one file
ffmpeg -f concat -safe 0 -i "$HOST_LIST" -c copy "$TEMP_DIR/host_merged.webm"

# Merge guest chunks into one file
ffmpeg -f concat -safe 0 -i "$GUEST_LIST" -c copy "$TEMP_DIR/guest_merged.webm"

# Now merge both streams side by side
ffmpeg -i "$TEMP_DIR/host_merged.webm" -i "$TEMP_DIR/guest_merged.webm" \
  -filter_complex "[0:v]scale=iw/2:ih[left]; [1:v]scale=iw/2:ih[right]; [left][right]hstack=inputs=2[out]" \
  -map "[out]" -y "$OUTPUT_FILE"

echo "🎉 Final video for $ROOM_ID saved to $OUTPUT_FILE"
