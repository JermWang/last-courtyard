// Test-only itineraries. Nothing here is included in the game or displayed
// as a route: the controller must still steer, brake and survive the physics.
function expeditionLine(track,side=-1){
  const points=[[0,0],[10,-2],[24,-6.8],[39,-6.8],[52,2],[80,6],[110,12],[150,-4],[200,-3],[225,2],
    [250,-12],[280,-23],[310,-23],[340,-22],[370,-24],[398,-38],[418,-38],[434,-38],[470,-42],[520,-44],[620,-45],
    [700,-20],[760,-20],[810,-24],[850,-40],[885,-40],[930,-24],[1030,-20],[1080,-20],
    [1130,-17],[1160,-17],[1205,-17],[1300,-20],[1380,-20],[1430,-24],[1485,-46],[1525,-46],
    [1580,-20],[1680,-20],[1740,-20],[1780,-25],[1810,-21],[1860,-21],[1920,-20],[2020,-20],
    [2100,-20],[2170,-25],[2220,-44],[2275,-44],[2330,-20],[2410,-20],[2500,-20],[2644,-20]];
  if(side>0)for(const p of points)if(p[0]>620)p[1]=-p[1]*.75;
  // The right-hand itinerary uses the other natural saddles, not a mirrored
  // assumption about the shape of the mountain.
  if(side>0)for(const [y,x] of [[850,22],[885,22],[1160,43],[1205,43],[1485,16],[1525,16],[1810,44],[1860,44],[2220,18],[2275,18]])points.find(p=>p[0]===y)[1]=x;
  if(Math.abs(side)>1){
    const flank=[90,140,180,220,250,270,300,260,225,190,160,170,220,250,285,300,270,230,200,200,210,230,260,280,240,200,160,120,90,45,25,20];
    let i=0;for(const p of points)if(p[0]>620)p[1]=Math.sign(side)*flank[i++];
  }
  const base=y=>{
    let i=points.findIndex(([n])=>n>y);if(i<1)i=points.length-1;
    const [a,x]=points[i-1],[b,n]=points[i];return track.mirrored*(x+(n-x)*(y-a)/(b-a))+spine(y);
  };
  function spine(y){
    if(track.spine)return track.spine(y);
    const knots=track.spineKnots;if(!knots||y<=220||y>=2640)return 0;
    const i=knots.findIndex(p=>p[0]>y)-1,[a,h0]=knots[i],[b,h1]=knots[i+1];
    const before=knots[Math.max(0,i-1)],after=knots[Math.min(knots.length-1,i+2)];
    const s0=i===1?0:(h1-before[1])/(b-before[0]),s1=i+1===knots.length-1?0:(after[1]-h0)/(after[0]-a);
    const t=(y-a)/(b-a),t2=t*t,t3=t2*t;
    return track.mirrored*((2*t3-3*t2+1)*h0+(t3-2*t2+t)*(b-a)*s0+(-2*t3+3*t2)*h1+(t3-t2)*(b-a)*s1);
  }
  const corrections=[];
  const line=y=>base(y)+corrections.reduce((x,c)=>x+c.amount*Math.exp(-Math.pow((y-c.y)/c.width,2)),0);
  // Re-evaluate the line after each detour: adjacent trunks can make the sum
  // of independent obstacle offsets unsafe even though either alone is clear.
  for(let pass=0;pass<3;pass++)for(const [rx,ry,r] of [...track.rocks].sort((a,b)=>a[1]-b[1])){
    const separation=line(ry)-rx,clearance=r+2.7;
    if(Math.abs(separation)<clearance-.15)corrections.push({y:ry,width:r+(ry>650&&(track.landscape||track.spineKnots)?15:9),
      amount:(Math.sign(separation)||track.mirrored)*clearance-separation});
  }
  return line;
}
module.exports=expeditionLine;
