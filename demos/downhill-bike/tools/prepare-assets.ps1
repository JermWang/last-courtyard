$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$demo = Split-Path -Parent $PSScriptRoot
$source = Join-Path $demo 'assets/source'
$output = Join-Path $demo 'assets/runtime'
New-Item -ItemType Directory -Path $output -Force | Out-Null
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$settings = [System.Drawing.Imaging.EncoderParameters]::new(1)
$settings.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]74)
foreach ($id in @('park_dirt','gravel_floor_04','forest_floor')) {
    $original = [System.Drawing.Bitmap]::new((Join-Path $source "$id.jpg"))
    $tile = [System.Drawing.Bitmap]::new(256,256,[System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $canvas = [System.Drawing.Graphics]::FromImage($tile)
    $canvas.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.DrawImage($original,0,0,256,256)
    $canvas.Dispose()
    $original.Dispose()
    # Preserve local texture detail while leaving the trail palette under art direction.
    $levels = [double[]]::new(256*256)
    $sum = 0.0
    for ($y=0; $y -lt 256; $y++) {
        for ($x=0; $x -lt 256; $x++) {
            $c=$tile.GetPixel($x,$y)
            $value=.2126*$c.R+.7152*$c.G+.0722*$c.B
            $levels[$y*256+$x]=$value
            $sum+=$value
        }
    }
    $mean=$sum/$levels.Length
    for ($y=0; $y -lt 256; $y++) {
        for ($x=0; $x -lt 256; $x++) {
            $value=[int][Math]::Max(0,[Math]::Min(255,128+($levels[$y*256+$x]-$mean)*1.58))
            $tile.SetPixel($x,$y,[System.Drawing.Color]::FromArgb($value,$value,$value))
        }
    }
    $tile.Save((Join-Path $output "$id.jpg"),$jpeg,$settings)
    $tile.Dispose()
}
$settings.Dispose()
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $source 'bicycle_sounds.zip'))
try {
    foreach($name in @('bicycle_spokes-1.ogg','rotating_bicycle_bell-1.ogg')){
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($zip.GetEntry($name),(Join-Path $output $name),$true)
    }
} finally {$zip.Dispose()}
Get-ChildItem -LiteralPath $output | Select-Object Name,Length
