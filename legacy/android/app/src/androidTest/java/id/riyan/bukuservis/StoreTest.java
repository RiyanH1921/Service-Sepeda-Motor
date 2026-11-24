package id.riyan.bukuservis;
import android.test.AndroidTestCase;
import java.time.LocalDate;
import java.util.*;
import static id.riyan.bukuservis.Models.*;
@SuppressWarnings("deprecation") public class StoreTest extends AndroidTestCase {
    private Store store;
    private Vehicle a,b;
    @Override protected void setUp() throws Exception {
        super.setUp();
        getContext().deleteDatabase("test.db");
        store=new Store(getContext(),"test.db");
        a=motor("Vario","W 6299 BY");
        b=motor("Motor kedua","B 123 AB");
    }
    @Override protected void tearDown() throws Exception {
        store.close();
        getContext().deleteDatabase("test.db");
        super.tearDown();
    }
    private Vehicle motor(String name,String plate) {
        Vehicle v=new Vehicle();
        v.name=name;
        v.plate=plate;
        store.saveVehicle(v);
        return v;
    }
    private Visit visit(Vehicle vehicle,String date,long km,String...jobs) {
        Visit v=new Visit();
        v.vehicleId=vehicle.id;
        v.date=date;
        v.km=km;
        v.jobs.addAll(Arrays.asList(jobs));
        v.workshop="Bengkel Bintang 99";
        return v;
    }
    public void testOldReceiptAndRepeatedSave() {
        Visit recent=visit(a,"2026-11-19",14500,"Ganti kampas rem");
        store.saveVisit(recent);
        store.saveVisit(recent);
        Visit old=visit(a,"2026-08-10",12000,"Ganti oli mesin");
        store.saveVisit(old);
        assertEquals(2,store.visits(a.id,"").size());
        assertEquals(recent.id,store.visits(a.id,"").get(0).id);
        assertEquals(Long.valueOf(14500),store.vehicle(a.id).km);
        assertTrue(store.visits(b.id,"").isEmpty());
    }
    public void testSearchMultipleJobsCaseAndWorkshopCorrection() {
        Visit v=visit(a,"2026-08-10",12000,"Ganti oli mesin","Ganti oli gardan");
        store.saveVisit(v);
        assertEquals(1,store.visits(a.id,"OLI").size());
        assertEquals(2,store.visit(v.id).jobs.size());
        v.workshop="Bengkel Baru";
        store.saveVisit(v);
        assertEquals(1,store.visits(a.id,"baru").size());
        assertTrue(store.visits(a.id,"bintang").isEmpty());
        assertTrue(store.visits(b.id,"OLI").isEmpty());
    }
    public void testSameDateUsesCreatedInstant() {
        Visit first=visit(a,"2026-08-10",12000,"A");
        first.created="2026-08-10T12:00:00+07:00";
        Visit second=visit(a,"2026-08-10",12000,"B");
        second.created="2026-08-10T06:00:00Z";
        store.saveVisit(second);
        store.saveVisit(first);
        assertEquals(second.id,store.visits(a.id,"").get(0).id);
    }
    public void testManualOdometerCannotDecrease() {
        a.km=14500L;
        store.saveVehicle(a);
        a.km=14000L;
        try {
            store.saveVehicle(a);
            fail();
        } catch(IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("14500"));
        }
        assertEquals(Long.valueOf(14500),store.vehicle(a.id).km);
        a.km=14500L;
        store.saveVehicle(a);
    }
    public void testUniquePlate() {
        try {
            motor("Duplikat","w6299by");
            fail();
        } catch(IllegalArgumentException expected) {
        }
        assertEquals(2,store.vehicles().size());
    }
    public void testNegativeCostRejectedWithoutPartialVisit() {
        Visit v=visit(a,"2026-08-10",12000,"Oli","Ban");
        v.cost=-1L;
        try {
            store.saveVisit(v);
            fail();
        } catch(IllegalArgumentException expected) {
        }
        assertTrue(store.visits(a.id,"").isEmpty());
        assertNull(store.vehicle(a.id).km);
    }
    public void testReminderUniqueAndDisabledThenReplaced() {
        Reminder r=new Reminder();
        r.vehicleId=a.id;
        r.component="Oli mesin";
        r.km=16500L;
        store.saveReminder(r);
        Reminder other=new Reminder();
        other.vehicleId=a.id;
        other.component="oli mesin";
        other.km=17000L;
        try {
            store.saveReminder(other);
            fail();
        } catch(IllegalArgumentException expected) {
        }
        r.active=false;
        store.saveReminder(r);
        store.saveReminder(other);
        assertEquals(1,store.reminders(a.id,true).size());
    }
    public void testCsvRoundTripAndReimport() {
        Visit v=visit(a,"2026-08-10",12000,"Ganti oli mesin","Filter udara");
        v.cost=0L;
        v.workshop="Bengkel, \"A\"";
        v.notes="Satu\nDua";
        store.saveVisit(v);
        String csv=store.exportCsv();
        store.close();
        getContext().deleteDatabase("test.db");
        store=new Store(getContext(),"test.db");
        Store.ImportResult result=store.importCsv(csv);
        assertEquals(1,result.imported);
        assertEquals(v.id,store.visits(null,"").get(0).id);
        assertEquals(v.created,store.visit(v.id).created);
        assertEquals(v.notes,store.visit(v.id).notes);
        assertEquals(Long.valueOf(0),store.visit(v.id).cost);
        assertEquals(2,store.visit(v.id).jobs.size());
        assertEquals(1,store.importCsv(csv).skipped);
        assertEquals(1,store.visits(null,"").size());
    }
    public void testMalformedImportRollsBackVehiclesAndVisits() {
        Visit v=visit(a,"2026-08-10",12000,"Oli");
        store.saveVisit(v);
        String csv=store.exportCsv();
        String incoming=csv.replace(a.id,"new-motor-id").replace(a.plate,"B 999 ZZ").replace(v.id,"new-service-id");
        List<Csv.Row> rows=Csv.parse(incoming);
        List<String> damaged=new ArrayList<>(rows.get(1).fields);
        damaged.set(0,"bad-visit");
        damaged.set(7,"-2");
        try {
            store.importCsv(incoming+Csv.row(damaged));
            fail();
        } catch(IllegalArgumentException expected) {
            assertTrue(expected.getMessage().contains("Baris 3"));
        }
        assertEquals(1,store.visits(null,"").size());
        assertEquals(2,store.vehicles().size());
    }
    public void testConflictingMetadataRollsBack() {
        Visit v=visit(a,"2026-08-10",12000,"Oli");
        store.saveVisit(v);
        String csv=store.exportCsv().replace("Bengkel Bintang 99","Bengkel lain");
        try {
            store.importCsv(csv);
            fail();
        } catch(IllegalArgumentException expected) {
        }
        assertEquals("Bengkel Bintang 99",store.visit(v.id).workshop);
    }
    public void testStorageFailureRollsBackEntireEdit() {
        Visit v=visit(a,"2026-08-10",12000,"Oli");
        store.saveVisit(v);
        store.getWritableDatabase().execSQL("CREATE TRIGGER fail_link BEFORE INSERT ON visit_jobs BEGIN SELECT RAISE(ABORT,'Simulasi penyimpanan gagal'); END");
        v.jobs=Arrays.asList("Ban","Aki");
        v.cost=100000L;
        try {
            store.saveVisit(v);
            fail();
        } catch(android.database.sqlite.SQLiteException expected) {
        }
        Visit intact=store.visit(v.id);
        assertEquals(Arrays.asList("Oli"),intact.jobs);
        assertNull(intact.cost);
        assertEquals(1,store.visits(a.id,"").size());
    }
    public void testReopenPersistsPreferencesAndData() {
        Visit v=visit(a,"2026-08-10",12000,"Oli");
        store.saveVisit(v);
        store.setPref("profile","Riyan Uji");
        store.setPref("notifications","false");
        store.close();
        store=new Store(getContext(),"test.db");
        assertEquals(v.id,store.visits(a.id,"").get(0).id);
        assertEquals("Riyan Uji",store.pref("profile",""));
        assertEquals("false",store.pref("notifications",""));
    }
    public void testSearch1000Visits() {
        store.getWritableDatabase().beginTransaction();
        try {
            for(int i=0; i<1000; i++) {
                Visit v=visit(a,"2026-08-10",12000,"Ganti oli mesin");
                store.saveVisit(v);
            }
            store.getWritableDatabase().setTransactionSuccessful();
        } finally {
            store.getWritableDatabase().endTransaction();
        }
        int pass=0;
        long max=0;
        for(int i=0; i<20; i++) {
            long start=System.nanoTime();
            assertEquals(1000,store.visits(a.id,"OLI").size());
            long ms=(System.nanoTime()-start)/1000000;
            max=Math.max(max,ms);
            if(ms<=1000)pass++;
        }
        android.util.Log.i("BukuServisTest","Search 1000 visits: "+pass+"/20 <= 1s; max="+max+"ms");
        assertTrue("Pencarian harus <=1 detik dalam 19/20 percobaan",pass>=19);
    }
}
