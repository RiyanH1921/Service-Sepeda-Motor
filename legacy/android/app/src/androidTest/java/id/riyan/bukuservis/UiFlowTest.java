package id.riyan.bukuservis;
import android.graphics.Bitmap;
import android.test.ActivityInstrumentationTestCase2;
import android.view.*;
import android.widget.*;
import java.io.FileOutputStream;
import java.util.Arrays;
import static id.riyan.bukuservis.Models.*;
@SuppressWarnings("deprecation") public class UiFlowTest extends ActivityInstrumentationTestCase2<MainActivity> {
    public UiFlowTest() {
        super(MainActivity.class);
    }
    @Override protected void setUp() throws Exception {
        super.setUp();
        setActivityInitialTouchMode(true);
        getInstrumentation().getTargetContext().deleteDatabase(Store.databaseName);
    }
    private View find(View v,String label) {
        if(v instanceof TextView && label.equals(((TextView)v).getText().toString()))return v;
        if(label.contentEquals(v.getContentDescription()==null?"":v.getContentDescription()))return v;
        if(v instanceof ViewGroup)for(int i=0; i<((ViewGroup)v).getChildCount(); i++) {
            View hit=find(((ViewGroup)v).getChildAt(i),label);
            if(hit!=null)return hit;
        }
        return null;
    }
    private EditText field(View v,String hint) {
        if(v instanceof EditText&&hint.contentEquals(((EditText)v).getHint()))return (EditText)v;
        if(v instanceof ViewGroup)for(int i=0; i<((ViewGroup)v).getChildCount(); i++) {
            EditText e=field(((ViewGroup)v).getChildAt(i),hint);
            if(e!=null)return e;
        }
        return null;
    }
    private View content() {
        return getActivity().getWindow().getDecorView();
    }
    private ScrollView scroller(View v) {
        if(v instanceof ScrollView)return (ScrollView)v;
        if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++) {
            ScrollView hit=scroller(((ViewGroup)v).getChildAt(i));
            if(hit!=null)return hit;
        }
        return null;
    }
    public void testFormSaveReachableAfterScroll() throws Exception {
        seed();
        getActivity();
        click("+  Catat servis");
        click("Ganti oli mesin");
        getInstrumentation().runOnMainSync(()->scroller(content()).fullScroll(View.FOCUS_DOWN));
        getInstrumentation().waitForIdleSync();
        android.graphics.Rect rect=new android.graphics.Rect();
        assertTrue(find(content(),"✓  Simpan servis").getGlobalVisibleRect(rect));
        assertTrue(rect.height()>0);
        screenshot("preview-formulir.png");
    }
    private void click(String label) {
        boolean[] found={false};
        getInstrumentation().runOnMainSync(()-> {
            View v=find(content(),label);
            if(v==null)return;
            found[0]=true;
            while(!v.isClickable()&&v.getParent() instanceof View)v=(View)v.getParent();
            v.performClick();
        });
        assertTrue("Tombol: "+label,found[0]);
        getInstrumentation().waitForIdleSync();
    }
    private void fill(String hint,String value) {
        getInstrumentation().runOnMainSync(()-> {
            EditText e=field(content(),hint); assertNotNull(hint,e); e.setText(value);
        });
        getInstrumentation().waitForIdleSync();
    }
    private void visible(String text) {
        assertNotNull("Teks: "+text,find(content(),text));
    }
    private void screenshot(String name) throws Exception {
        getInstrumentation().waitForIdleSync();
        android.os.SystemClock.sleep(200);
        Bitmap bitmap=getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(bitmap);
        try(FileOutputStream out=getInstrumentation().getTargetContext().openFileOutput(name,0)) {
            bitmap.compress(Bitmap.CompressFormat.PNG,100,out);
        }
        bitmap.recycle();
    }
    private void seed() {
        try(Store store=new Store(getInstrumentation().getTargetContext())) {
            Vehicle v=new Vehicle();
            v.name="Vario Biru Tua";
            v.plate="W 6299 BY";
            v.km=14500L;
            store.saveVehicle(v);
            Vehicle second=new Vehicle();
            second.name="Motor Kedua";
            second.plate="B 123 AB";
            store.saveVehicle(second);
            Visit oil=new Visit();
            oil.vehicleId=v.id;
            oil.date="2026-08-10";
            oil.km=12000L;
            oil.jobs=Arrays.asList("Ganti oli mesin");
            store.saveVisit(oil);
            Visit brake=new Visit();
            brake.vehicleId=v.id;
            brake.date="2026-11-19";
            brake.km=14500L;
            brake.cost=120000L;
            brake.workshop="Bengkel Bintang 99";
            brake.jobs=Arrays.asList("Ganti kampas rem");
            store.saveVisit(brake);
            Reminder r=new Reminder();
            r.vehicleId=v.id;
            r.component="Oli mesin";
            r.date="2027-01-18";
            store.saveReminder(r);
            store.setPref("notifications","false");
        }
    }
    public void testCleanInstallAndNavigation() throws Exception {
        getActivity();
        visible("Selamat datang di garasi");
        screenshot("preview-kosong.png");
        click("+  Tambah kendaraan");
        visible("Kendaraan saya");
        click("Kembali");
        click("Pengaturan");
        visible("Pengaturan");
        visible("Bantuan");
    }
    public void testSearchCorrectionAndScreens() throws Exception {
        seed();
        getActivity();
        visible("19 Nov 2026");
        screenshot("preview-garasi.png");
        click("Riwayat");
        fill("Cari pekerjaan atau bengkel","OLI");
        visible("10 Agu 2026");
        assertNull(find(content(),"19 Nov 2026"));
        screenshot("preview-riwayat.png");
        click("10 Agu 2026");
        visible("Detail servis");
        click("Ubah catatan");
        fill("Nama bengkel","Bengkel Baru");
        click("✓  Simpan servis");
        visible("19 Nov 2026");
        click("Riwayat");
        fill("Cari pekerjaan atau bengkel","baru");
        visible("Bengkel Baru");
        click("Pengingat");
        visible("Oli mesin");
        screenshot("preview-pengingat.png");
        click("+  Tambah pengingat");
        visible("Buat pengingat");
        visible("Target odometer (opsional)");
    }
}
