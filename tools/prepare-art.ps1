$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
public static class CutoutBounds {
  public static int[] Scan(Bitmap img) {
    int minX=img.Width,minY=img.Height,maxX=0,maxY=0,clear=0,opaque=0;
    for(int y=0;y<img.Height;y++)for(int x=0;x<img.Width;x++){
      int a=img.GetPixel(x,y).A;
      if(a==0)clear++; if(a==255)opaque++;
      if(a>16){minX=Math.Min(minX,x);maxX=Math.Max(maxX,x);minY=Math.Min(minY,y);maxY=Math.Max(maxY,y);}
    }
    return new int[]{minX,minY,maxX,maxY,clear,opaque};
  }
}
'@ -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Runtime
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'assets/source/cutouts'
$runtime = Join-Path $root 'assets/runtime'
New-Item -ItemType Directory -Force -Path $source,$runtime | Out-Null
$items = @(
  @{Name='adventurer-idle'; Input='C:\Users\dejes\.codex\generated_images\01a1acdf-4744-7833-b66e-5fd00a899ac5\exec-cd371855-fce9-435d-9af2-a0578de5a244.png'; Width=256; Height=336},
  @{Name='courtyard-shrub'; Input='C:\Users\dejes\.codex\generated_images\01a1acdf-4744-7833-b66e-5fd00a899ac5\exec-8fdd6306-da30-4a90-a4ea-c8e3dd9361f7.png'; Width=384; Height=216},
  @{Name='courtyard-tree'; Input='C:\Users\dejes\.codex\generated_images\01a1acdf-4744-7833-b66e-5fd00a899ac5\exec-aa9b27da-662b-476f-8fc3-09d53ce61c68.png'; Width=512; Height=480}
)
$generated='C:\Users\dejes\.codex\generated_images\01a1acdf-4744-7833-b66e-5fd00a899ac5'
$directions=@{
  'front'='exec-c8899dbb-7f82-42db-8243-372c67a4edce.png'
  'front-left'='exec-5f499ed4-31d0-4458-9ba9-f405a30d738c.png'
  'right'='exec-a21b81e7-94ba-49cb-aa28-ab9d2f6d1e22.png'
  'left'='exec-24692df2-d51c-47dd-bcff-7f420b30c1c9.png'
  'back-right'='exec-98d1df00-ea1e-4b58-a0b3-1b029fd305fa.png'
  'back'='exec-9ce7942b-3a54-4e85-9262-fe5d786fa0f9.png'
  'back-left'='exec-a17423e1-3534-41b7-8a34-50b3f0f0a190.png'
}
foreach($key in $directions.Keys){$items+=@{Name=('adventurer-'+$key);Input=(Join-Path $generated $directions[$key]);Width=256;Height=336}}
foreach ($item in $items) {
  $original = Join-Path $source ($item.Name + '-source.png')
  if (!(Test-Path -LiteralPath $original)) { Copy-Item -LiteralPath $item.Input -Destination $original }
  $img = [Drawing.Bitmap]::new($original)
  $bounds=[CutoutBounds]::Scan($img)
  $minX,$minY,$maxX,$maxY,$clear,$opaque=$bounds
  if($clear -eq 0 -or $opaque -eq 0){throw 'Expected genuine RGBA cutout'}
  $bmp=[Drawing.Bitmap]::new($item.Width,$item.Height,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g=[Drawing.Graphics]::FromImage($bmp);$g.Clear([Drawing.Color]::Transparent)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode=[Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $ratio=[Math]::Min(($item.Width-12)/($maxX-$minX+1),($item.Height-12)/($maxY-$minY+1))
  $dw=[int](($maxX-$minX+1)*$ratio);$dh=[int](($maxY-$minY+1)*$ratio)
  $rect=[Drawing.Rectangle]::new([int](($item.Width-$dw)/2),$item.Height-6-$dh,$dw,$dh)
  $g.DrawImage($img,$rect,$minX,$minY,($maxX-$minX+1),($maxY-$minY+1),[Drawing.GraphicsUnit]::Pixel)
  $out=Join-Path $runtime ($item.Name+'.png');$bmp.Save($out,[Drawing.Imaging.ImageFormat]::Png)
  Write-Output ($item.Name+': '+$img.Width+'x'+$img.Height+' source; '+$clear+' fully transparent pixels; runtime '+$item.Width+'x'+$item.Height+'; six pixel foot padding.')
  $g.Dispose();$bmp.Dispose();$img.Dispose()
}
# Inspection only: show alpha edges against warm light and navy dark backgrounds.
$qa=[Drawing.Bitmap]::new(1000,400);$q=[Drawing.Graphics]::FromImage($qa)
$q.Clear([Drawing.ColorTranslator]::FromHtml('#f5e8ca'))
$brush=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#17343e'));$q.FillRectangle($brush,500,0,500,400)
foreach($offset in @(0,500)){
  $a=[Drawing.Bitmap]::new((Join-Path $runtime 'adventurer-idle.png'));$s=[Drawing.Bitmap]::new((Join-Path $runtime 'courtyard-shrub.png'))
  $q.DrawImage($a,$offset+20,28,256,336);$q.DrawImage($s,$offset+275,230,210,118)
  $a.Dispose();$s.Dispose()
}
$qa.Save((Join-Path $source 'alpha-inspection.png'),[Drawing.Imaging.ImageFormat]::Png)
$brush.Dispose();$q.Dispose();$qa.Dispose()
$materials=Join-Path $root 'assets/source/materials';New-Item -ItemType Directory -Force -Path $materials | Out-Null
foreach($item in @(@{Name='stone';File='exec-57a1eaed-771f-4186-8add-e7e86e8e07dd.png'},@{Name='wood';File='exec-7d000a9a-c599-4767-9606-5a4906a52efe.png'},@{Name='brass';File='exec-f84e2950-b011-4609-8eac-6004e31eefde.png'})){
  $src=Join-Path $materials ($item.Name+'-source.png');if(!(Test-Path -LiteralPath $src)){Copy-Item -LiteralPath (Join-Path $generated $item.File) -Destination $src}
  $im=[Drawing.Bitmap]::new($src);$out=[Drawing.Bitmap]::new(512,512);$g=[Drawing.Graphics]::FromImage($out)
  $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic;$g.DrawImage($im,0,0,512,512)
  $out.Save((Join-Path $runtime ($item.Name+'-tile.png')),[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$out.Dispose();$im.Dispose()
}
# All directions on a common baseline for visual identity/scale review.
$sheet=[Drawing.Bitmap]::new(1024,760);$g=[Drawing.Graphics]::FromImage($sheet);$g.Clear([Drawing.ColorTranslator]::FromHtml('#eee5cf'))
$labels=@('front','idle','right','back-right','back','back-left','left','front-left');$font=[Drawing.Font]::new('Arial',14);$ink=[Drawing.SolidBrush]::new([Drawing.ColorTranslator]::FromHtml('#263c3c'))
for($i=0;$i -lt $labels.Count;$i++){$x=($i%4)*256;$y=[int][Math]::Floor($i/4)*380;$im=[Drawing.Bitmap]::new((Join-Path $runtime ('adventurer-'+$labels[$i]+'.png')));$g.DrawImage($im,$x,$y,256,336);$g.DrawString($labels[$i],$font,$ink,$x+15,$y+345);$im.Dispose()}
$sheet.Save((Join-Path $source 'direction-review.png'),[Drawing.Imaging.ImageFormat]::Png);$g.Dispose();$sheet.Dispose();$font.Dispose();$ink.Dispose()
