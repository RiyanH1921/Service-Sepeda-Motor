package id.riyan.bukuservis;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import static id.riyan.bukuservis.Models.*;
public final class Store extends SQLiteOpenHelper {
    // Overridden only inside the instrumentation process to isolate test fixtures.
    static String databaseName = "buku-servis.db";
    public Store(Context context) {
        this(context, databaseName);
    }
    Store(Context context, String name) {
        super(context, name, null, 1);
    }
    @Override public void onConfigure(SQLiteDatabase db) {
        db.setForeignKeyConstraintsEnabled(true);
    }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE vehicles(id TEXT PRIMARY KEY,name TEXT NOT NULL,plate TEXT NOT NULL,plate_key TEXT NOT NULL UNIQUE,km INTEGER CHECK(km>=0))");
        db.execSQL("CREATE TABLE visits(id TEXT PRIMARY KEY,vehicle_id TEXT NOT NULL REFERENCES vehicles(id),date TEXT NOT NULL,created TEXT NOT NULL,km INTEGER CHECK(km>=0),cost INTEGER CHECK(cost>=0),workshop TEXT NOT NULL,notes TEXT NOT NULL)");
        db.execSQL("CREATE INDEX visits_vehicle_date ON visits(vehicle_id,date DESC,created DESC)");
        db.execSQL("CREATE TABLE jobs(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE)");
        db.execSQL("CREATE TABLE visit_jobs(visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,job_id TEXT NOT NULL REFERENCES jobs(id),PRIMARY KEY(visit_id,job_id))");
        db.execSQL("CREATE TABLE reminders(id TEXT PRIMARY KEY,vehicle_id TEXT NOT NULL REFERENCES vehicles(id),component TEXT NOT NULL,component_key TEXT NOT NULL,date TEXT NOT NULL,km INTEGER CHECK(km>=0),days INTEGER NOT NULL,time TEXT NOT NULL,active INTEGER NOT NULL,last_status TEXT NOT NULL)");
        db.execSQL("CREATE UNIQUE INDEX active_component ON reminders(vehicle_id,component_key) WHERE active=1");
        db.execSQL("CREATE TABLE prefs(key TEXT PRIMARY KEY,value TEXT NOT NULL)");
    }
    @Override public void onUpgrade(SQLiteDatabase db,int oldVersion,int newVersion) {
        throw new IllegalStateException("Migrasi database belum tersedia.");
    }
    public String pref(String key,String fallback) {
        try(Cursor c=getReadableDatabase().rawQuery("SELECT value FROM prefs WHERE key=?",new String[] {
            key
        })) {
            return c.moveToFirst()?c.getString(0):fallback;
        }
    }
    public void setPref(String key,String value) {
        ContentValues v=new ContentValues();
        v.put("key",key);
        v.put("value",value);
        getWritableDatabase().insertWithOnConflict("prefs",null,v,SQLiteDatabase.CONFLICT_REPLACE);
    }
    private static Long num(Cursor c,int i) {
        return c.isNull(i)?null:c.getLong(i);
    }
    public List<Vehicle> vehicles() {
        List<Vehicle> list=new ArrayList<>();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,name,plate,km FROM vehicles ORDER BY rowid",null)) {
            while(c.moveToNext()) {
                Vehicle v=new Vehicle(false);
                v.id=c.getString(0);
                v.name=c.getString(1);
                v.plate=c.getString(2);
                v.km=num(c,3);
                list.add(v);
            }
        }
        return list;
    }
    public Vehicle vehicle(String id) {
        for(Vehicle v:vehicles())if(v.id.equals(id))return v;
        return null;
    }
    public void saveVehicle(Vehicle v) {
        if(v.name.trim().isEmpty()||plateKey(v.plate).trim().isEmpty())throw new IllegalArgumentException("Nama dan pelat kendaraan wajib diisi.");
        if(v.km!=null&&v.km<0)throw new IllegalArgumentException("Kilometer tidak boleh negatif.");
        Vehicle previous=vehicle(v.id);
        if(previous!=null&&previous.km!=null&&(v.km==null||v.km<previous.km))throw new IllegalArgumentException("Pembacaan terakhir " + previous.km + " km. Periksa kembali isian.");
        for(Vehicle other:vehicles())if(!other.id.equals(v.id)&&plateKey(other.plate).equals(plateKey(v.plate)))throw new IllegalArgumentException("Pelat kendaraan sudah digunakan.");
        ContentValues values=new ContentValues();
        values.put("id",v.id);
        values.put("name",v.name.trim());
        values.put("plate",v.plate.trim().toUpperCase(Locale.ROOT));
        values.put("plate_key",plateKey(v.plate));
        values.put("km",v.km);
        if(previous==null)getWritableDatabase().insertOrThrow("vehicles",null,values);
        else getWritableDatabase().update("vehicles",values,"id=?",new String[] {
            v.id
        });
    }
    public List<Visit> visits(String vehicleId,String query) {
        List<Visit> list=readVisits(vehicleId==null?"":" WHERE v.vehicle_id=?",vehicleId==null?null:new String[] {
            vehicleId
        });
        String q=Models.key(query);
        list.removeIf(v->!q.isEmpty()&&!Models.key(v.workshop).contains(q)&&v.jobs.stream().noneMatch(j->Models.key(j).contains(q)));
        Map<String,java.time.Instant> timestamps=new HashMap<>();
        for(Visit v:list)timestamps.put(v.id,OffsetDateTime.parse(v.created).toInstant());
        list.sort(Comparator.<Visit,String>comparing(v->v.date).reversed().thenComparing(v->timestamps.get(v.id),Comparator.reverseOrder()).thenComparing(v->v.id,Comparator.reverseOrder()));
        return list;
    }
    private List<Visit> readVisits(String where,String[] args) {
        LinkedHashMap<String,Visit> found=new LinkedHashMap<>();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT v.id,v.vehicle_id,v.date,v.created,v.km,v.cost,v.workshop,v.notes,j.name FROM visits v LEFT JOIN visit_jobs link ON link.visit_id=v.id LEFT JOIN jobs j ON j.id=link.job_id"+where+" ORDER BY v.id,link.rowid",args)) {
            while(c.moveToNext()) {
                String id=c.getString(0);
                Visit v=found.get(id);
                if(v==null) {
                    v=new Visit(false);
                    v.id=id;
                    v.vehicleId=c.getString(1);
                    v.date=c.getString(2);
                    v.created=c.getString(3);
                    v.km=num(c,4);
                    v.cost=num(c,5);
                    v.workshop=c.getString(6);
                    v.notes=c.getString(7);
                    found.put(id,v);
                }
                if(!c.isNull(8))v.jobs.add(c.getString(8));
            }
        }
        return new ArrayList<>(found.values());
    }
    public Visit visit(String id) {
        List<Visit> found=readVisits(" WHERE v.id=?",new String[] {
            id
        });
        return found.isEmpty()?null:found.get(0);
    }
    public void saveVisit(Visit v) {
        v.validate(LocalDate.now());
        if(vehicle(v.vehicleId)==null)throw new IllegalArgumentException("Kendaraan tidak ditemukan.");
        SQLiteDatabase db=getWritableDatabase();
        db.beginTransaction();
        try {
            writeVisit(db,v);
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }
    private void writeVisit(SQLiteDatabase db,Visit v) {
        ContentValues values=new ContentValues();
        values.put("id",v.id);
        values.put("vehicle_id",v.vehicleId);
        values.put("date",v.date);
        values.put("created",v.created);
        values.put("km",v.km);
        values.put("cost",v.cost);
        values.put("workshop",v.workshop);
        values.put("notes",v.notes);
        if(db.update("visits",values,"id=?",new String[] {
            v.id
        })==0)db.insertOrThrow("visits",null,values);
        db.delete("visit_jobs","visit_id=?",new String[] {
            v.id
        });
        for(String job:new LinkedHashSet<>(v.jobs)) {
            String jobId=UUID.nameUUIDFromBytes(Models.key(job).getBytes(StandardCharsets.UTF_8)).toString();
            ContentValues j=new ContentValues();
            j.put("id",jobId);
            j.put("name",job.trim());
            j.put("name_key",Models.key(job));
            db.insertWithOnConflict("jobs",null,j,SQLiteDatabase.CONFLICT_IGNORE);
            ContentValues link=new ContentValues();
            link.put("visit_id",v.id);
            link.put("job_id",jobId);
            db.insertWithOnConflict("visit_jobs",null,link,SQLiteDatabase.CONFLICT_IGNORE);
        }
        if(v.km!=null)db.execSQL("UPDATE vehicles SET km=? WHERE id=? AND (km IS NULL OR km<?)",new Object[] {
            v.km,v.vehicleId,v.km
        });
    }
    public List<Reminder> reminders(String vehicleId,boolean activeOnly) {
        List<Reminder> list=new ArrayList<>();
        try(Cursor c=getReadableDatabase().rawQuery("SELECT id,vehicle_id,component,date,km,days,time,active,last_status FROM reminders"+(vehicleId==null?" WHERE 1=1":" WHERE vehicle_id=?")+(activeOnly?" AND active=1":""),vehicleId==null?null:new String[] {
            vehicleId
        })) {
            while(c.moveToNext()) {
                Reminder r=new Reminder(false);
                r.id=c.getString(0);
                r.vehicleId=c.getString(1);
                r.component=c.getString(2);
                r.date=c.getString(3);
                r.km=num(c,4);
                r.days=c.getInt(5);
                r.time=c.getString(6);
                r.active=c.getInt(7)==1;
                r.lastStatus=c.getString(8);
                list.add(r);
            }
        }
        LocalDate today=LocalDate.now();
        list.sort(Comparator.<Reminder>comparingInt(r-> {
            Vehicle v=vehicle(r.vehicleId); Status s=r.status(today,v==null?null:v.km); return s==Status.DUE?0:1;
        }) .thenComparing(r->r.date.isEmpty()?"9999-12-31":r.date) .thenComparingLong(r-> {
            Vehicle v=vehicle(r.vehicleId); return r.km==null||v==null||v.km==null?Long.MAX_VALUE:r.km-v.km;
        }));
        return list;
    }
    public Reminder reminder(String id) {
        for(Reminder r:reminders(null,false))if(r.id.equals(id))return r;
        return null;
    }
    public void saveReminder(Reminder r) {
        r.validate();
        if(vehicle(r.vehicleId)==null)throw new IllegalArgumentException("Kendaraan tidak ditemukan.");
        for(Reminder other:reminders(r.vehicleId,true))if(r.active&&!other.id.equals(r.id)&&Models.key(other.component).equals(Models.key(r.component)))throw new IllegalArgumentException("Komponen ini sudah memiliki pengingat aktif. Ubah pengingat yang ada.");
        ContentValues v=new ContentValues();
        v.put("id",r.id);
        v.put("vehicle_id",r.vehicleId);
        v.put("component",r.component.trim());
        v.put("component_key",Models.key(r.component));
        v.put("date",r.date);
        v.put("km",r.km);
        v.put("days",r.days);
        v.put("time",r.time);
        v.put("active",r.active?1:0);
        v.put("last_status",r.lastStatus);
        SQLiteDatabase db=getWritableDatabase();
        if(db.update("reminders",v,"id=?",new String[] {
            r.id
        })==0)db.insertOrThrow("reminders",null,v);
    }
    public void markReminder(String id,String status) {
        ContentValues v=new ContentValues();
        v.put("last_status",status);
        getWritableDatabase().update("reminders",v,"id=?",new String[] {
            id
        });
    }
    public String exportCsv() {
        StringBuilder out=new StringBuilder(Csv.row(Csv.HEADER));
        for(Visit v:visits(null,"")) {
            Vehicle motor=vehicle(v.vehicleId);
            for(String job:v.jobs)out.append(Csv.row(Arrays.asList(v.id,motor.id,motor.name,motor.plate,v.date,v.created,job,v.km==null?"":v.km.toString(),v.cost==null?"":v.cost.toString(),v.workshop,v.notes)));
        }
        return out.toString();
    }
    public static class ImportResult {
        public int imported,skipped;
    }
    public ImportResult importCsv(String text) {
        List<Csv.Row> rows=Csv.parse(text);
        Map<String,Visit> groups=new LinkedHashMap<>();
        Map<String,List<String>> metadata=new HashMap<>();
        SQLiteDatabase db=getWritableDatabase();
        db.beginTransaction();
        ImportResult result=new ImportResult();
        try {
            for(int i=1; i<rows.size(); i++) {
                Csv.Row row=rows.get(i);
                List<String> f=row.fields;
                try {
                    if(f.get(0).trim().isEmpty()||f.get(1).trim().isEmpty())throw new IllegalArgumentException("ID servis dan kendaraan wajib diisi");
                    Vehicle motor=vehicle(f.get(1));
                    if(motor!=null&&(!plateKey(motor.plate).equals(plateKey(f.get(3)))||!motor.name.equals(f.get(2))))throw new IllegalArgumentException("ID kendaraan bertentangan dengan nama atau pelat tersimpan");
                    if(motor==null) {
                        motor=new Vehicle();
                        motor.id=f.get(1);
                        motor.name=f.get(2);
                        motor.plate=f.get(3);
                        saveVehicle(motor);
                    }
                    List<String> meta=new ArrayList<>(f);
                    meta.remove(6);
                    Visit v=groups.get(f.get(0));
                    if(v==null) {
                        v=new Visit();
                        v.id=f.get(0);
                        v.vehicleId=motor.id;
                        v.date=f.get(4);
                        v.created=f.get(5);
                        v.km=Models.number(f.get(7),"Odometer");
                        v.cost=Models.number(f.get(8),"Biaya");
                        v.workshop=f.get(9);
                        v.notes=f.get(10);
                        groups.put(v.id,v);
                        metadata.put(v.id,meta);
                    } else if(!metadata.get(v.id).equals(meta))throw new IllegalArgumentException("metadata kunjungan dengan ID sama berbeda");
                    if(v.jobs.stream().anyMatch(j->Models.key(j).equals(Models.key(f.get(6)))))throw new IllegalArgumentException("pekerjaan duplikat dalam satu kunjungan");
                    v.jobs.add(f.get(6));
                    v.validate(LocalDate.now());
                    Visit existing=visit(v.id);
                    if(existing!=null&&!sameMetadata(existing,v))throw new IllegalArgumentException("ID servis bertentangan dengan catatan tersimpan");
                } catch(IllegalArgumentException e) {
                    throw Csv.error(row.line,e.getMessage());
                }
            }
            for(Visit v:groups.values()) {
                Visit previous=visit(v.id);
                if(previous!=null) {
                    Set<String> a=new HashSet<>(),b=new HashSet<>();
                    for(String j:previous.jobs)a.add(Models.key(j));
                    for(String j:v.jobs)b.add(Models.key(j));
                    if(!a.equals(b)) {
                        int line=rows.stream().filter(r->r.fields.get(0).equals(v.id)).findFirst().get().line;
                        throw Csv.error(line,"pekerjaan berbeda untuk ID servis tersimpan");
                    }
                    result.skipped++;
                } else {
                    writeVisit(db,v);
                    result.imported++;
                }
            }
            db.setTransactionSuccessful();
            return result;
        } finally {
            db.endTransaction();
        }
    }
    private boolean sameMetadata(Visit a,Visit b) {
        return a.vehicleId.equals(b.vehicleId)&&a.date.equals(b.date)&&a.created.equals(b.created)&&Objects.equals(a.km,b.km)&&Objects.equals(a.cost,b.cost)&&a.workshop.equals(b.workshop)&&a.notes.equals(b.notes);
    }
}
