package id.riyan.bukuservis;
import android.app.NotificationManager;
import android.service.notification.StatusBarNotification;
import android.test.AndroidTestCase;
import static id.riyan.bukuservis.Models.*;
/** Uses the separate database selected by TestRunner. */
@SuppressWarnings("deprecation") public class NotificationTest extends AndroidTestCase {
    private Store store;
    private void awaitCount(NotificationManager manager,int expected) {
        long deadline=android.os.SystemClock.elapsedRealtime()+5000;
        while(manager.getActiveNotifications().length!=expected&&android.os.SystemClock.elapsedRealtime()<deadline)android.os.SystemClock.sleep(50);
        assertEquals(expected,manager.getActiveNotifications().length);
    }
    @Override protected void setUp() throws Exception {
        super.setUp();
        getContext().deleteDatabase(Store.databaseName);
        store=new Store(getContext());
        getContext().getSystemService(NotificationManager.class).cancelAll();
    }
    @Override protected void tearDown() throws Exception {
        getContext().getSystemService(NotificationManager.class).cancelAll();
        store.close();
        getContext().deleteDatabase(Store.databaseName);
        super.tearDown();
    }
    public void testKmTransitionDeduplicationAndSwitch() {
        Vehicle v=new Vehicle();
        v.name="Motor Uji";
        v.plate="UJI 1";
        v.km=16499L;
        store.saveVehicle(v);
        Reminder r=new Reminder();
        r.vehicleId=v.id;
        r.component="Oli mesin";
        r.km=16500L;
        store.saveReminder(r);
        ReminderReceiver.evaluate(getContext());
        assertEquals("SCHEDULED",store.reminder(r.id).lastStatus);
        v.km=16500L;
        store.saveVehicle(v);
        ReminderReceiver.evaluate(getContext());
        NotificationManager manager=getContext().getSystemService(NotificationManager.class);
        assertEquals("DUE",store.reminder(r.id).lastStatus);
        awaitCount(manager,1);
        StatusBarNotification first=manager.getActiveNotifications()[0];
        assertNotNull(first.getNotification().contentIntent);
        ReminderReceiver.evaluate(getContext());
        assertEquals(1,manager.getActiveNotifications().length);
        assertEquals(first.getPostTime(),manager.getActiveNotifications()[0].getPostTime());
        store.setPref("notifications","false");
        ReminderReceiver.evaluate(getContext());
        awaitCount(manager,0);
        assertEquals(1,store.reminders(v.id,true).size());
        store.setPref("notifications","true");
        ReminderReceiver.evaluate(getContext());
        assertEquals(0,manager.getActiveNotifications().length);
    }
}
