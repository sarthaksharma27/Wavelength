$chunkDir = "C:\Users\hp\X-project\Riverside-webrtc\routes\recordings\068bb445-21b0-4bb5-bfbd-6ae0f0f26ac8\host"
$webmFiles = Get-ChildItem -Path $chunkDir -Filter *.webm

foreach ($file in $webmFiles) {
    Write-Host "`nChecking file: $($file.Name)" -ForegroundColor Cyan

    try {
        $ffprobeOutput = ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$($file.FullName)" 2>&1
        $video = $ffprobeOutput.Trim()

        $ffprobeOutput = ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "$($file.FullName)" 2>&1
        $audio = $ffprobeOutput.Trim()

        if ($video -ne "vp9" -or $audio -ne "opus") {
            Write-Host "⚠️  Stream check failed: Video = $video, Audio = $audio" -ForegroundColor Yellow
        } else {
            Write-Host "✅ Streams valid: Video = $video, Audio = $audio" -ForegroundColor Green
        }
    }
    catch {
        Write-Host "❌ Error checking file: $($file.Name)" -ForegroundColor Red
    }
}
