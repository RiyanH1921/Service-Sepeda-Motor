package id.riyan.bukuservis;
import android.content.Context;
import android.graphics.*;
import android.view.View;
/** Small original line icons; drawn as vectors at the current density. */
final class IconView extends View {
    private final String icon;
    private final Paint p=new Paint(3);
    private final int color;
    IconView(Context context,String icon,int color) {
        super(context);
        this.icon=icon;
        this.color=color;
        setImportantForAccessibility(IMPORTANT_FOR_ACCESSIBILITY_NO);
    }
    private void line(Canvas c,float... pts) {
        Path path=new Path();
        path.moveTo(pts[0],pts[1]);
        for(int i=2; i<pts.length; i+=2)path.lineTo(pts[i],pts[i+1]);
        c.drawPath(path,p);
    }
    @Override protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        Canvas c=canvas;
        c.save();
        float scale=Math.min(getWidth(),getHeight())/24f;
        c.translate((getWidth()-24*scale)/2,(getHeight()-24*scale)/2);
        c.scale(scale,scale);
        p.setColor(color);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeWidth(1.8f);
        p.setStrokeJoin(Paint.Join.ROUND);
        p.setStrokeCap(Paint.Cap.ROUND);
        switch(icon) {
            case "home":line(c,3,11,12,3,21,11,21,21,15,21,15,15,9,15,9,21,3,21,3,11);
            break;
            case "history":c.drawArc(3,3,21,21,-125,305,false,p);
            line(c,3,3,3,9,9,9);
            line(c,12,7,12,12,16,14);
            break;
            case "bell":line(c,4,18,6,15,6,10);
            c.drawArc(6,4,18,16,180,180,false,p);
            line(c,18,10,18,15,20,18,4,18);
            c.drawArc(9,17,15,22,0,180,false,p);
            break;
            case "plus":line(c,4,12,20,12);
            line(c,12,4,12,20);
            break;
            case "back":line(c,13,4,5,12,13,20);
            line(c,5,12,21,12);
            break;
            case "down":line(c,5,9,12,16,19,9);
            break;
            case "next":line(c,9,4,17,12,9,20);
            break;
            case "check":line(c,4,12,10,18,21,6);
            break;
            case "calendar":c.drawRoundRect(3,5,21,22,3,3,p);
            line(c,3,10,21,10);
            line(c,8,2,8,7);
            line(c,16,2,16,7);
            break;
            case "km":c.drawArc(3,3,21,21,140,260,false,p);
            line(c,12,12,17,7);
            c.drawCircle(12,12,2,p);
            line(c,6,7,7,8);
            line(c,12,4,12,6);
            line(c,5,13,7,13);
            break;
            case "person":c.drawCircle(12,7,4,p);
            c.drawArc(4,12,20,26,180,180,false,p);
            line(c,4,19,4,22,20,22,20,19);
            break;
            case "search":c.drawCircle(10,10,7,p);
            line(c,15,15,22,22);
            break;
            case "settings":c.drawCircle(12,12,4,p);
            c.drawCircle(12,12,9,p);
            for(int a=0; a<8; a++) {
                double d=a*Math.PI/4;
                line(c,12+8*(float)Math.cos(d),12+8*(float)Math.sin(d),12+11*(float)Math.cos(d),12+11*(float)Math.sin(d));
            }
            break;
            case "oil":line(c,12,2,5,13);
            c.drawArc(4,7,20,23,0,180,false,p);
            line(c,19,13,12,2);
            break;
            case "download":case "upload":line(c,4,16,4,21,20,21,20,16);
            if(icon.equals("download")) {
                line(c,12,2,12,16);
                line(c,6,10,12,16,18,10);
            } else {
                line(c,12,16,12,2);
                line(c,6,8,12,2,18,8);
            }
            break;
            case "help":c.drawCircle(12,12,10,p);
            c.drawArc(8,5,16,13,180,240,false,p);
            line(c,12,12,12,14);
            c.drawPoint(12,18,p);
            break;
            case "book":line(c,12,5,7,3,2,4,2,20,7,19,12,21,17,19,22,20,22,4,17,3,12,5,12,21);
            break;
            case "wrench":line(c,14,4,11,9,15,13,20,10,20,15,17,17,13,16,6,23,2,19,9,12,8,8,10,4,14,4);
            break;
            default:c.drawCircle(12,12,9,p);
            c.drawCircle(12,12,4,p);
            for(int a=0; a<8; a++) {
                double d=a*Math.PI/4;
                line(c,12+6*(float)Math.cos(d),12+6*(float)Math.sin(d),12+8*(float)Math.cos(d),12+8*(float)Math.sin(d));
            }
        }
        c.restore();
    }
}
