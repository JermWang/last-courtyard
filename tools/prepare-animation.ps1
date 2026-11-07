$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing.Common,System.Drawing.Primitives,System.Runtime,System.Console,System.Private.Windows.GdiPlus,System.Private.Windows.Core -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
public static class AnimationPrep {
  static int[] Bounds(Bitmap im) {
    int x0=im.Width,y0=im.Height,x1=0,y1=0;
    for(int y=0;y<im.Height;y++)for(int x=0;x<im.Width;x++)if(im.GetPixel(x,y).A>160){x0=Math.Min(x0,x);x1=Math.Max(x1,x);y0=Math.Min(y0,y);y1=Math.Max(y1,y);}
    if(x1<x0||y1<y0)throw new Exception("Empty animation frame");
    return new int[]{x0,y0,x1,y1};
  }
  static double[] Hood(Bitmap im,int[] b) {
    int widest=0,left=0,right=0;
    int end=b[1]+(int)((b[3]-b[1])*0.42);
    for(int y=b[1];y<end;y++){
      int l=im.Width,r=0,count=0;
      for(int x=b[0];x<=b[2];x++){Color c=im.GetPixel(x,y);if(c.A>220&&c.R>90&&c.R>c.G*1.35&&c.R>c.B*1.2){l=Math.Min(l,x);r=Math.Max(r,x);count++;}}
      if(count>12&&r-l>widest){widest=r-l;left=l;right=r;}
    }
    if(widest<15)throw new Exception("Could not identify stable hood anchor");
    return new double[]{widest,(left+right)*0.5};
  }
  static Bitmap Align(Bitmap im,double headWidth,int frame,double idleTop) {
    int[] b=Bounds(im);double[] h=Hood(im,b);double scale=headWidth/h[0];
    double dx=128-h[1]*scale,dy=232-b[3]*scale;
    if(frame>=12&&frame<=14)dy=idleTop+(frame==14?12:0)-b[1]*scale;
    if(dx+b[0]*scale<3||dx+b[2]*scale>253)Console.WriteLine("WARN: wide frame "+frame+" needs inspection");
    Bitmap output=new Bitmap(256,256,PixelFormat.Format32bppArgb);
    using(Graphics g=Graphics.FromImage(output)){
      g.Clear(Color.Transparent);g.InterpolationMode=InterpolationMode.HighQualityBicubic;g.PixelOffsetMode=PixelOffsetMode.HighQuality;
      g.DrawImage(im,new RectangleF((float)dx,(float)dy,(float)(im.Width*scale),(float)(im.Height*scale)),new RectangleF(0,0,im.Width,im.Height),GraphicsUnit.Pixel);
    }
    return output;
  }
  public static void Reel(string sheetPath,string idlePath,string output,int direction){
    using(Bitmap sheet=new Bitmap(sheetPath))using(Bitmap idle=new Bitmap(idlePath))
    using(Bitmap atlas=new Bitmap(512,256,PixelFormat.Format32bppArgb))using(Graphics g=Graphics.FromImage(atlas)){
      int[] b=Bounds(idle);double head=Hood(idle,b)[0]*184.0/(b[3]-b[1]);g.Clear(Color.Transparent);
      for(int j=0;j<2;j++){int i=direction*2+j,c=i%4,r=i/4;
        using(Bitmap f=sheet.Clone(new Rectangle(c*sheet.Width/4,r*sheet.Height/4,sheet.Width/4,sheet.Height/4),PixelFormat.Format32bppArgb))
        using(Bitmap a=Align(f,head,16,48))g.DrawImageUnscaled(a,j*256,0);
      }atlas.Save(output,ImageFormat.Png);
    }
  }
  public static void ReelPair(string sheetPath,string idlePath,string output){
    using(Bitmap sheet=new Bitmap(sheetPath))using(Bitmap idle=new Bitmap(idlePath))
    using(Bitmap atlas=new Bitmap(512,256,PixelFormat.Format32bppArgb))using(Graphics g=Graphics.FromImage(atlas)){
      int[] b=Bounds(idle);double head=Hood(idle,b)[0]*184.0/(b[3]-b[1]);g.Clear(Color.Transparent);
      for(int j=0;j<2;j++){
        int x0=j*sheet.Width/2,x1=(j+1)*sheet.Width/2;
        using(Bitmap f=sheet.Clone(new Rectangle(x0,0,x1-x0,sheet.Height),PixelFormat.Format32bppArgb))
        using(Bitmap a=Align(f,head,16,48))g.DrawImageUnscaled(a,j*256,0);
      }atlas.Save(output,ImageFormat.Png);
    }
  }
  public static void Aim(string sheetPath,string idlePath,string baseAtlas,string output,string review){
    using(Bitmap sheet=new Bitmap(sheetPath))using(Bitmap idle=new Bitmap(idlePath))
    using(Bitmap atlas=new Bitmap(baseAtlas))using(Graphics g=Graphics.FromImage(atlas))
    using(Bitmap qa=new Bitmap(1024,276))using(Graphics qg=Graphics.FromImage(qa))
    using(Font font=new Font("Arial",11))using(SolidBrush text=new SolidBrush(Color.FromArgb(30,55,55))){
      int[] b=Bounds(sheet);
      using(Bitmap reference=atlas.Clone(new Rectangle(512,512,256,256),PixelFormat.Format32bppArgb)){
        int[] old=Bounds(reference);double[] head=Hood(sheet,b);
        // Match both the established hood width and standing height. Small
        // generated proportion drift must not make the avatar shrink on draw.
        double sx=Hood(reference,old)[0]/head[0],sy=(double)(old[3]-old[1])/(b[3]-b[1]);
        using(Bitmap aligned=new Bitmap(256,256,PixelFormat.Format32bppArgb)){
          using(Graphics ag=Graphics.FromImage(aligned)){
            ag.Clear(Color.Transparent);ag.InterpolationMode=InterpolationMode.HighQualityBicubic;ag.PixelOffsetMode=PixelOffsetMode.HighQuality;
            ag.DrawImage(sheet,new RectangleF((float)(128-head[1]*sx),(float)(232-b[3]*sy),(float)(sheet.Width*sx),(float)(sheet.Height*sy)),new RectangleF(0,0,sheet.Width,sheet.Height),GraphicsUnit.Pixel);
          }
          g.CompositingMode=CompositingMode.SourceCopy;
          // A stable held-draw pose is shared by the half/full charge states.
          // The existing raise and release poses remain unchanged.
          g.DrawImageUnscaled(aligned,256,512);g.DrawImageUnscaled(aligned,512,512);
        }
      }
      qg.Clear(Color.FromArgb(238,229,207));g.CompositingMode=CompositingMode.SourceCopy;
      string[] labels={"raise","half draw","full draw","release"};
      for(int i=0;i<4;i++){
        using(Bitmap aligned=atlas.Clone(new Rectangle(i*256,512,256,256),PixelFormat.Format32bppArgb)){
          if(i%2==1){using(SolidBrush bg=new SolidBrush(Color.FromArgb(23,52,62)))qg.FillRectangle(bg,i*256,0,256,256);}
          qg.DrawImageUnscaled(aligned,i*256,0);qg.DrawString(labels[i],font,text,i*256+12,257);
        }
      }
      atlas.Save(output,ImageFormat.Png);qa.Save(review,ImageFormat.Png);
    }
  }
  public static void Prepare(string sheetPath,string idlePath,string atlasPath,string normalizedIdlePath,string reviewPath){
    using(Bitmap sheet=new Bitmap(sheetPath))using(Bitmap idle=new Bitmap(idlePath)){
      int[] b=Bounds(idle);double[] hood=Hood(idle,b);double headWidth=hood[0]*184.0/(b[3]-b[1]);
      double idleTop=232-184;
      using(Bitmap alignedIdle=Align(idle,headWidth,-1,idleTop))alignedIdle.Save(normalizedIdlePath,ImageFormat.Png);
      using(Bitmap atlas=new Bitmap(1024,1024,PixelFormat.Format32bppArgb))using(Graphics ag=Graphics.FromImage(atlas))
      using(Bitmap qa=new Bitmap(1024,1104))using(Graphics qg=Graphics.FromImage(qa))
      using(Font font=new Font("Arial",11))using(SolidBrush text=new SolidBrush(Color.FromArgb(30,55,55))){
        ag.Clear(Color.Transparent);qg.Clear(Color.FromArgb(238,229,207));
        string[] names={"walk 1","walk 2","walk 3","walk 4","walk 5","walk 6","walk 7","walk 8","raise","half draw","full draw","release","jump","fall","swing / reel","land"};
        for(int i=0;i<16;i++){
          int col=i%4,row=i/4,x0=(int)Math.Round(col*sheet.Width/4.0),y0=(int)Math.Round(row*sheet.Height/4.0);
          int x1=(int)Math.Round((col+1)*sheet.Width/4.0),y1=(int)Math.Round((row+1)*sheet.Height/4.0);
          using(Bitmap frame=sheet.Clone(new Rectangle(x0,y0,x1-x0,y1-y0),PixelFormat.Format32bppArgb))
          using(Bitmap aligned=Align(frame,headWidth,i,idleTop)){
            ag.DrawImageUnscaled(aligned,col*256,row*256);
            if(col%2==1){using(SolidBrush bg=new SolidBrush(Color.FromArgb(23,52,62)))qg.FillRectangle(bg,col*256,row*276,256,256);}
            qg.DrawImageUnscaled(aligned,col*256,row*276);qg.DrawString(names[i],font,text,col*256+12,row*276+257);
          }
        }
        atlas.Save(atlasPath,ImageFormat.Png);qa.Save(reviewPath,ImageFormat.Png);
      }
      Console.WriteLine(System.IO.Path.GetFileName(atlasPath)+": 16 frames; shared head scale and root; genuine alpha retained.");
    }
  }
}
'@
$root=Split-Path -Parent $PSScriptRoot
$source=Join-Path $root 'assets/source/animation'
$runtime=Join-Path $root 'assets/runtime'
$generated='C:\Users\dejes\.codex\generated_images\01a1acdf-4744-7833-b66e-5fd00a899ac5'
$manifest=Get-Content -Raw -LiteralPath (Join-Path $source 'manifest.json') | ConvertFrom-Json
foreach($entry in $manifest.PSObject.Properties){
  $dir=$entry.Name;$src=Join-Path $source ($dir+'-sheet.png')
  if(!(Test-Path -LiteralPath $src)){Copy-Item -LiteralPath (Join-Path $generated $entry.Value.file) -Destination $src}
  [AnimationPrep]::Prepare($src,(Join-Path $runtime ('adventurer-'+$dir+'.png')),(Join-Path $runtime ('motion-'+$dir+'.png')),(Join-Path $runtime ('motion-idle-'+$dir+'.png')),(Join-Path $source ($dir+'-review.png')))
}


$directions=@('back','back-right','right','idle','front','front-left','left','back-left')
for($i=0;$i -lt 8;$i++){
  $dir=$directions[$i]
  [AnimationPrep]::Reel((Join-Path $source 'reel-sheet.png'),(Join-Path $runtime ('adventurer-'+$dir+'.png')),(Join-Path $runtime ('motion-reel-'+$dir+'.png')),$i)
}
foreach($dir in @('front','back')){
  $aimSheet=Join-Path $source ('aim-'+$dir+'-v3.png')
  if(Test-Path -LiteralPath $aimSheet){
    [AnimationPrep]::Aim($aimSheet,(Join-Path $runtime ('adventurer-'+$dir+'.png')),(Join-Path $runtime ('motion-'+$dir+'.png')),(Join-Path $runtime ('motion-'+$dir+'-v3.png')),(Join-Path $source ('aim-'+$dir+'-v3-review.png')))
  }
}
$correctedReel=Join-Path $source 'reel-front-left-v2.png'
if(Test-Path -LiteralPath $correctedReel){
  [AnimationPrep]::ReelPair($correctedReel,(Join-Path $runtime 'adventurer-front-left.png'),(Join-Path $runtime 'motion-reel-front-left-v2.png'))
}
