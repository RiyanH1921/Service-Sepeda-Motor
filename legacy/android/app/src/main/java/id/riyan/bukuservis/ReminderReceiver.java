package id.riyan.bukuservis;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.os.Build;
import java.time.*;
import static id.riyan.bukuservis.Models.*;
public final class ReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context, Intent intent) {
        String action=intent.getAction();
        if(Intent.ACTION_BOOT_COMPLETED.equals(action)||Intent.ACTION_TIME_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)||"id.riyan.bukuservis.TICK".equals(action))evaluate(context);
    }
    public static synchronized void evaluate(Context context) {
        try(Store store=new Store(context)) {
            NotificationManager manager=context.getSystemService(NotificationManager.class);
            manager.createNotificationChannel(new NotificationChannel("servis", "Pengingat servis", NotificationManager.IMPORTANCE_DEFAULT));
            boolean enabled=store.pref("notifications","true").equals("true");
            boolean allowed=Build.VERSION.SDK_INT<33||context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;
            allowed=allowed&&manager.areNotificationsEnabled();
            ZonedDateTime now=ZonedDateTime.now();
            LocalDate today=now.toLocalDate();
            long next=now.toLocalDate().plusDays(1).atTime(0,1).atZone(now.getZone()).toInstant().toEpochMilli();
            for(Reminder r:store.reminders(null,false)) {
                int notificationId=r.id.hashCode();
                if(!enabled||!r.active) {
                    manager.cancel(notificationId);
                    continue;
                }
                Vehicle v=store.vehicle(r.vehicleId);
                if(v==null)continue;
                Status status=r.status(today,v.km);
                if(status!=Status.DUE&&status!=Status.NEAR) {
                    manager.cancel(notificationId);
                    if(!r.lastStatus.equals(status.name()))store.markReminder(r.id,status.name());
                }
                boolean kmDue=r.km!=null&&v.km!=null&&v.km>=r.km;
                ZonedDateTime delivery=null;
                if(!r.date.isEmpty())delivery=LocalDate.parse(r.date).minusDays(status==Status.NEAR?r.days:0).atTime(LocalTime.parse(r.time)).atZone(now.getZone());
                if(allowed&&(status==Status.DUE||status==Status.NEAR)&&!r.lastStatus.equals(status.name())&&(kmDue||delivery==null||!now.isBefore(delivery))) {
                    Intent open=new Intent(context,MainActivity.class).putExtra("reminder_id",r.id).setAction("reminder:"+r.id).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    PendingIntent click=PendingIntent.getActivity(context,notificationId,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
                    Notification notification=new Notification.Builder(context,"servis").setSmallIcon(R.drawable.ic_notification).setContentTitle(r.component+" · "+status.label).setContentText(v.name+" — buka pengingat untuk melihat target servis.").setContentIntent(click).setAutoCancel(true).build();
                    manager.notify(notificationId,notification);
                    store.markReminder(r.id,status.name());
                }
                if(!r.date.isEmpty())for(LocalDate date:new LocalDate[] {
                    LocalDate.parse(r.date).minusDays(r.days),LocalDate.parse(r.date)
                }) {
                    long when=date.atTime(LocalTime.parse(r.time)).atZone(now.getZone()).toInstant().toEpochMilli();
                    if(when>now.toInstant().toEpochMilli())next=Math.min(next,when);
                }
            }
            PendingIntent tick=PendingIntent.getBroadcast(context,0,new Intent(context,ReminderReceiver.class).setAction("id.riyan.bukuservis.TICK"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            AlarmManager alarm=context.getSystemService(AlarmManager.class);
            if(enabled)alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next,tick);
            else alarm.cancel(tick);
        } catch(RuntimeException e) {
            android.util.Log.e("BukuServis","Evaluasi pengingat gagal; akan dicoba ketika aplikasi dibuka.",e);
        }
    }
}
