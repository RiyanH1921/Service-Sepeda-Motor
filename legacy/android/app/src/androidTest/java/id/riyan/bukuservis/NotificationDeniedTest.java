package id.riyan.bukuservis;

import android.app.NotificationManager;
import android.test.AndroidTestCase;
import static id.riyan.bukuservis.Models.*;

/** Run this class separately after revoking POST_NOTIFICATIONS on the test device. */
@SuppressWarnings("deprecation")
public class NotificationDeniedTest extends AndroidTestCase {
    public void testDeniedPermissionKeepsDataUsable() {
        if(android.os.Build.VERSION.SDK_INT>=33)assertEquals(android.content.pm.PackageManager.PERMISSION_DENIED,getContext().checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS));
        getContext().deleteDatabase(Store.databaseName);
        try(Store store=new Store(getContext())) {
            Vehicle v=new Vehicle();v.name="Motor Uji";v.plate="UJI 2";v.km=100L;store.saveVehicle(v);
            Reminder r=new Reminder();r.vehicleId=v.id;r.component="Oli mesin";r.km=100L;store.saveReminder(r);
            Visit visit=new Visit();visit.vehicleId=v.id;visit.jobs.add("Ganti oli mesin");store.saveVisit(visit);
            ReminderReceiver.evaluate(getContext());
            assertEquals(Status.DUE,store.reminder(r.id).status(java.time.LocalDate.now(),100L));
            assertEquals(1,store.reminders(v.id,true).size());
            assertEquals(1,store.visits(v.id,"OLI").size());
            assertEquals("",store.reminder(r.id).lastStatus);
            assertEquals(0,getContext().getSystemService(NotificationManager.class).getActiveNotifications().length);
        } finally {getContext().deleteDatabase(Store.databaseName);}
    }
}
