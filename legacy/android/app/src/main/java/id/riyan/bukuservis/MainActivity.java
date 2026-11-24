package id.riyan.bukuservis;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.*;
import android.text.*;
import android.view.*;
import android.view.inputmethod.InputMethodManager;
import android.widget.*;
import java.io.*;
import java.nio.*;
import java.nio.charset.*;
import java.time.*;
import java.time.format.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;
import static id.riyan.bukuservis.Models.*;
public final class MainActivity extends Activity {
    private static final int BG=0xfffbf7f0,GREEN=0xff154c35,INK=0xff18251e,MUTED=0xff6d736a,LINE=0xffd9d2c6,PALE=0xffe6ebd8,GOLD=0xffbb7d1c;
    private static final Locale ID=new Locale("id","ID");
    private static final String[] JOBS= {
        "Ganti oli mesin","Ganti oli gardan","Ganti kampas rem","Bersihkan filter udara","Periksa ban","Ganti aki","Servis CVT","Ganti busi","Servis rutin"
    };
    private static final String[] COMPONENTS= {
        "Oli mesin","Oli gardan","Kampas rem","Filter udara","Ban","Aki","CVT","Busi"
    };
    private Store store;
    private LinearLayout root,body;
    private ScrollView scroll;
    private String activeId,screen="garage",entityId="",historyQuery="";
    private Runnable captureDraft;
    private Bundle draft;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private volatile boolean destroyed=false,importing=false;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        store=new Store(this);
        activeId=store.pref("active_vehicle","");
        ensureActive();
        if(state!=null) {
            screen=state.getString("screen","garage");
            entityId=state.getString("entity","");
            historyQuery=state.getString("query","");
            draft=state.getBundle("draft");
        }
        render();
        openNotification(getIntent());
    }
    @Override protected void onResume() {
        super.onResume();
        ReminderReceiver.evaluate(this);
        if(Arrays.asList("garage","history","reminders","vehicles","settings").contains(screen))render();
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openNotification(intent);
    }
    private void openNotification(Intent intent) {
        String id=intent.getStringExtra("reminder_id");
        if(id!=null) {
            Reminder r=store.reminder(id);
            if(r!=null) {
                setActive(r.vehicleId);
                go("reminder",id);
            }
            intent.removeExtra("reminder_id");
        }
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        if(captureDraft!=null)captureDraft.run();
        out.putString("screen",screen);
        out.putString("entity",entityId);
        out.putString("query",historyQuery);
        out.putBundle("draft",draft);
        super.onSaveInstanceState(out);
    }
    @Override protected void onDestroy() {
        destroyed=true;
        io.shutdown();
        if(!importing)store.close();
        super.onDestroy();
    }
    @Override public void onBackPressed() {
        if(screen.equals("garage")) {
            super.onBackPressed();
            return;
        }
        if(screen.equals("service")||screen.equals("reminder")) {
            new AlertDialog.Builder(this).setTitle("Tinggalkan formulir?").setMessage("Perubahan yang belum disimpan akan dibuang.").setNegativeButton("Lanjut mengisi",null).setPositiveButton("Tinggalkan",(d,w)->go(screen.equals("reminder")?"reminders":"garage","")).show();
            return;
        }
        go(screen.equals("detail")?"history":"garage","");
    }
    private void ensureActive() {
        if(store.vehicle(activeId)==null) {
            List<Vehicle> v=store.vehicles();
            activeId=v.isEmpty()?"":v.get(0).id;
        }
    }
    private Vehicle active() {
        return store.vehicle(activeId);
    }
    private void setActive(String id) {
        store.setPref("active_vehicle",id);
        activeId=id;
    }
    private void go(String next,String id) {
        hideKeyboard();
        screen=next;
        entityId=id;
        draft=null;
        captureDraft=null;
        render();
    }
    private void hideKeyboard() {
        View focus=getCurrentFocus();
        if(focus!=null)((InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(focus.getWindowToken(),0);
    }
    private int dp(float n) {
        return Math.round(n*getResources().getDisplayMetrics().density);
    }
    private GradientDrawable bg(int fill,int stroke,int radius) {
        GradientDrawable d=new GradientDrawable();
        d.setColor(fill);
        d.setCornerRadius(dp(radius));
        if(stroke!=0)d.setStroke(dp(1),stroke);
        return d;
    }
    private LinearLayout column() {
        LinearLayout l=new LinearLayout(this);
        l.setOrientation(LinearLayout.VERTICAL);
        return l;
    }
    private LinearLayout row() {
        LinearLayout l=new LinearLayout(this);
        l.setOrientation(LinearLayout.HORIZONTAL);
        l.setGravity(Gravity.CENTER_VERTICAL);
        return l;
    }
    private void space(LinearLayout l,int h) {
        View v=new View(this);
        l.addView(v,new LinearLayout.LayoutParams(1,dp(h)));
    }
    private TextView text(String value,int size,int color,boolean bold) {
        TextView t=new TextView(this);
        t.setText(value);
        t.setTextSize(size);
        t.setTextColor(color);
        if(bold)t.setTypeface(Typeface.create("sans-serif",Typeface.BOLD));
        t.setLineSpacing(dp(2),1);
        return t;
    }
    private void label(LinearLayout l,String value) {
        space(l,20);
        l.addView(text(value,15,INK,true));
        space(l,9);
    }
    private LinearLayout card(LinearLayout parent,int fill,int border) {
        LinearLayout c=column();
        c.setPadding(dp(18),dp(18),dp(18),dp(18));
        c.setBackground(bg(fill,border,18));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.bottomMargin=dp(14);
        parent.addView(c,p);
        return c;
    }
    private void clickable(View view,Runnable action) {
        view.setClickable(true);
        view.setFocusable(true);
        view.setOnClickListener(v->action.run());
    }
    private LinearLayout actionRow(LinearLayout parent,String icon,String title,String subtitle,Runnable action) {
        LinearLayout r=row();
        r.setPadding(dp(14),dp(13),dp(14),dp(13));
        r.setMinimumHeight(dp(64));
        r.setBackground(bg(BG,LINE,13));
        r.addView(new IconView(this,icon,GREEN),new LinearLayout.LayoutParams(dp(27),dp(27)));
        LinearLayout labels=column();
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,-2,1);
        p.leftMargin=dp(13);
        r.addView(labels,p);
        labels.addView(text(title,17,INK,true));
        if(subtitle!=null&&!subtitle.isEmpty()) {
            space(labels,3);
            labels.addView(text(subtitle,13,MUTED,false));
        }
        if(action!=null) {
            r.addView(new IconView(this,"next",GREEN),new LinearLayout.LayoutParams(dp(19),dp(23)));
            clickable(r,action);
        }
        LinearLayout.LayoutParams params=new LinearLayout.LayoutParams(-1,-2);
        params.bottomMargin=dp(11);
        parent.addView(r,params);
        return r;
    }
    private TextView button(LinearLayout parent,String title,boolean primary,Runnable action) {
        TextView b=text(title,18,primary?BG:GREEN,true);
        b.setGravity(Gravity.CENTER);
        b.setPadding(dp(15),dp(15),dp(15),dp(15));
        b.setMinHeight(dp(56));
        b.setBackground(bg(primary?GREEN:BG,primary?0:GREEN,15));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);
        p.topMargin=dp(9);
        p.bottomMargin=dp(9);
        parent.addView(b,p);
        clickable(b,action);
        return b;
    }
    private void header(String title,boolean back) {
        LinearLayout r=row();
        r.setPadding(dp(20),dp(10),dp(16),dp(10));
        if(back) {
            FrameLayout hit=new FrameLayout(this);
            hit.setMinimumHeight(dp(48));
            IconView icon=new IconView(this,"back",GREEN);
            FrameLayout.LayoutParams ip=new FrameLayout.LayoutParams(dp(23),dp(23),Gravity.CENTER);
            hit.addView(icon,ip);
            r.addView(hit,new LinearLayout.LayoutParams(dp(48),dp(48)));
            hit.setContentDescription("Kembali");
            clickable(hit,this::onBackPressed);
        } else {
            r.addView(new IconView(this,"book",GREEN),new LinearLayout.LayoutParams(dp(29),dp(29)));
        }
        TextView name=text(title,18,GREEN,true);
        LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(0,-2,1);
        np.leftMargin=dp(10);
        r.addView(name,np);
        if(!back) {
            FrameLayout hit=new FrameLayout(this);
            hit.addView(new IconView(this,"settings",GREEN),new FrameLayout.LayoutParams(dp(25),dp(25),Gravity.CENTER));
            r.addView(hit,new LinearLayout.LayoutParams(dp(48),dp(48)));
            hit.setContentDescription("Pengaturan");
            clickable(hit,()->go("settings",""));
        }
        root.addView(r);
    }
    private void title(String value,String subtitle) {
        body.addView(text(value,31,INK,true));
        if(subtitle!=null&&!subtitle.isEmpty()) {
            space(body,5);
            body.addView(text(subtitle,15,MUTED,false));
        }
        space(body,23);
    }
    private void nav() {
        LinearLayout bar=row();
        bar.setPadding(dp(12),dp(8),dp(12),dp(8));
        bar.setBackground(bg(BG,LINE,0));
        String[] pages= {
            "garage","history","reminders"
        },names= {
            "Garasi","Riwayat","Pengingat"
        },icons= {
            "home","history","bell"
        };
        for(int i=0; i<3; i++) {
            final String page=pages[i];
            LinearLayout item=column();
            item.setGravity(Gravity.CENTER);
            item.setPadding(dp(6),dp(9),dp(6),dp(8));
            if(screen.equals(page))item.setBackground(bg(PALE,0,18));
            item.addView(new IconView(this,icons[i],screen.equals(page)?GREEN:MUTED),new LinearLayout.LayoutParams(dp(24),dp(24)));
            space(item,3);
            item.addView(text(names[i],12,screen.equals(page)?GREEN:MUTED,screen.equals(page)));
            bar.addView(item,new LinearLayout.LayoutParams(0,-2,1));
            item.setContentDescription(names[i]);
            clickable(item,()->go(page,""));
        }
        root.addView(bar);
    }
    private void render() {
        ensureActive();
        captureDraft=null;
        root=column();
        root.setBackgroundColor(BG);
        root.setFitsSystemWindows(true);
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v,insets)-> {
            if(Build.VERSION.SDK_INT>=30) {
                android.graphics.Insets system=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.ime()); v.setPadding(system.left,system.top,system.right,system.bottom);
            } else v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom()); return insets;
        });
        boolean tab=Arrays.asList("garage","history","reminders").contains(screen);
        header(screen.equals("garage")?"Garasi "+store.pref("profile","Riyan"):"Buku Servis",!tab);
        scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setClipToPadding(false);
        body=column();
        body.setPadding(dp(22),dp(16),dp(22),dp(28));
        scroll.addView(body);
        root.addView(scroll,new LinearLayout.LayoutParams(-1,0,1));
        switch(screen) {
            case "history":history();
            break;
            case "detail":detail();
            break;
            case "service":serviceForm();
            break;
            case "reminders":reminders();
            break;
            case "reminder":reminderForm();
            break;
            case "vehicles":vehicles();
            break;
            case "settings":settings();
            break;
            default:garage();
        }
        if(tab)nav();
    }
    private String date(String value) {
        return LocalDate.parse(value).format(DateTimeFormatter.ofPattern("d MMM yyyy",ID));
    }
    private String km(Long value) {
        return value==null?"Belum diisi":String.format(ID,"%,d km",value);
    }
    private String money(Long value) {
        return value==null?"Belum diisi":String.format(ID,"Rp%,d",value);
    }
    private void motorcycle(LinearLayout parent,int height) {
        ImageView im=new ImageView(this);
        im.setImageResource(R.drawable.motorcycle);
        im.setScaleType(ImageView.ScaleType.FIT_CENTER);
        im.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        parent.addView(im,new LinearLayout.LayoutParams(-1,dp(height)));
    }
    private void vehiclePicker(LinearLayout parent,Consumer<Vehicle> chosen,String id) {
        Vehicle v=store.vehicle(id);
        LinearLayout r=actionRow(parent,"km",v==null?"Tambah kendaraan":v.name,v==null?"Mulai buku servis Anda":v.plate,()-> {
            if(store.vehicles().isEmpty()) {
                go("vehicles",""); return;
            }
            List<Vehicle> vs=store.vehicles(); String[] choices=new String[vs.size()]; for(int i=0; i<choices.length; i++)choices[i]=vs.get(i).name+" · "+vs.get(i).plate; new AlertDialog.Builder(this).setTitle("Pilih kendaraan").setItems(choices,(d,w)->chosen.accept(vs.get(w))).setNeutralButton("Kelola kendaraan",(d,w)->go("vehicles","")).setNegativeButton("Batal",null).show();
        });
    }
    private void garage() {
        title("Buku Servis","Catatan rapi, motor terawat.");
        Vehicle motor=active();
        if(motor==null) {
            motorcycle(body,158);
            space(body,16);
            LinearLayout c=card(body,PALE,0);
            c.addView(text("Selamat datang di garasi",23,GREEN,true));
            space(c,8);
            c.addView(text("Tambahkan motor pertama Anda untuk mulai mencatat servis dan menjadwalkan perawatan.",16,MUTED,false));
            button(body,"+  Tambah kendaraan",true,()->go("vehicles",""));
            return;
        }
        vehiclePicker(body,v-> {
            setActive(v.id); render();
        },activeId);
        motorcycle(body,125);
        List<Visit> visits=store.visits(activeId,"");
        LinearLayout latest=card(body,GREEN,0);
        LinearLayout line=row();
        line.addView(new IconView(this,"wrench",PALE),new LinearLayout.LayoutParams(dp(23),dp(23)));
        TextView heading=text("  Servis terakhir",16,PALE,true);
        line.addView(heading);
        latest.addView(line);
        space(latest,14);
        if(visits.isEmpty()) {
            latest.addView(text("Belum ada servis tercatat",23,BG,true));
            space(latest,8);
            latest.addView(text("Setiap kunjungan punya ceritanya. Catat yang pertama.",14,PALE,false));
        } else {
            Visit v=visits.get(0);
            latest.addView(text(date(v.date),32,BG,true));
            space(latest,13);
            latest.addView(text(String.join(" · ",v.jobs),19,BG,true));
            space(latest,7);
            latest.addView(text(km(v.km),16,PALE,false));
            clickable(latest,()->go("detail",v.id));
        }
        button(body,"+  Catat servis",true,()->go("service",""));
        space(body,13);
        List<Reminder> reminders=store.reminders(activeId,true);
        if(reminders.isEmpty())actionRow(body,"bell","Jadwalkan perawatan","Buat pengingat komponen motor Anda",()->go("reminder",""));
        else {
            body.addView(text("PENGINGAT TERDEKAT",12,MUTED,true));
            space(body,10);
            reminderCard(reminders.get(0),body);
        }
        space(body,5);
        actionRow(body,"km","Kendaraan saya",km(motor.km),()->go("vehicles",""));
    }
    private TextWatcher watcher(Consumer<String> action) {
        return new TextWatcher() {
            public void beforeTextChanged(CharSequence s,int a,int c,int f) {
            }
            public void onTextChanged(CharSequence s,int a,int b,int c) {
                action.accept(s.toString());
            }
            public void afterTextChanged(Editable e) {
            }
        };
    }
    private EditText input(LinearLayout parent,String hint,String value,boolean numeric) {
        EditText e=new EditText(this);
        e.setTextSize(16);
        e.setTextColor(INK);
        e.setHintTextColor(MUTED);
        e.setSingleLine(true);
        e.setPadding(dp(15),dp(12),dp(15),dp(12));
        e.setMinHeight(dp(54));
        e.setBackground(bg(BG,LINE,12));
        e.setHint(hint);
        e.setContentDescription(hint);
        e.setInputType(numeric?android.text.InputType.TYPE_CLASS_NUMBER:android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        e.setText(value==null?"":value);
        parent.addView(e,new LinearLayout.LayoutParams(-1,-2));
        return e;
    }
    private void history() {
        title("Riwayat servis",null);
        vehiclePicker(body,v-> {
            setActive(v.id); render();
        },activeId);
        EditText search=input(body,"Cari pekerjaan atau bengkel",historyQuery,false);
        space(body,18);
        LinearLayout results=column();
        body.addView(results);
        int[] shown={50};
        Runnable[] fill=new Runnable[1];
        fill[0]=()-> {
            results.removeAllViews();
            if(active()==null) {
                empty(results,"Belum ada kendaraan","Tambahkan motor untuk mulai menyimpan riwayat.");
                return;
            }
            List<Visit> list=store.visits(activeId,historyQuery);
            if(list.isEmpty()) {
                empty(results,historyQuery.isEmpty()?"Belum ada servis tercatat":"Servis tidak ditemukan",historyQuery.isEmpty()?"Catat kunjungan bengkel pertama Anda.":"Coba nama pekerjaan atau bengkel lain.");
                button(results,historyQuery.isEmpty()?"Catat servis":"Hapus pencarian",false,()-> {
                    if(historyQuery.isEmpty())go("service",""); else search.setText("");
                });
            }
            String month="";
            int displayed=0;
            for(Visit v:list) {
                if(displayed++>=shown[0])break;
                String next=LocalDate.parse(v.date).format(DateTimeFormatter.ofPattern("MMMM yyyy",ID));
                if(!next.equals(month)) {
                    space(results,11);
                    TextView m=text(next,18,GREEN,true);
                    m.setPadding(dp(12),dp(8),dp(12),dp(8));
                    m.setBackground(bg(PALE,0,10));
                    results.addView(m);
                    space(results,13);
                    month=next;
                }
                LinearLayout c=card(results,BG,LINE);
                c.addView(text(date(v.date),24,INK,true));
                space(c,9);
                c.addView(text(String.join(" · ",v.jobs),17,INK,false));
                space(c,7);
                c.addView(text(km(v.km),14,MUTED,false));
                if(!v.workshop.isEmpty()) {
                    space(c,4);
                    c.addView(text(v.workshop,14,MUTED,false));
                }
                clickable(c,()->go("detail",v.id));
            }
            if(list.size()>shown[0])button(results,"Tampilkan 50 berikutnya",false,()-> {
                shown[0]+=50;
                fill[0].run();
            });
        };
        search.addTextChangedListener(watcher(q-> {
            historyQuery=q; shown[0]=50; fill[0].run();
        }));
        fill[0].run();
    }
    private void empty(LinearLayout parent,String title,String subtitle) {
        LinearLayout c=card(parent,PALE,0);
        c.addView(text(title,21,GREEN,true));
        space(c,8);
        c.addView(text(subtitle,15,MUTED,false));
    }
    private void detail() {
        Visit v=store.visit(entityId);
        if(v==null) {
            empty(body,"Catatan tidak ditemukan","Kembali ke Riwayat servis.");
            return;
        }
        title("Detail servis",null);
        LinearLayout c=card(body,PALE,0);
        c.addView(text(date(v.date),30,GREEN,true));
        Vehicle motor=store.vehicle(v.vehicleId);
        space(body,4);
        actionRow(body,"km","Kendaraan",motor.name+" · "+motor.plate,null);
        actionRow(body,"wrench","Pekerjaan",String.join("\n",v.jobs),null);
        actionRow(body,"km","Odometer",km(v.km),null);
        actionRow(body,"home","Bengkel",v.workshop.isEmpty()?"Belum diisi":v.workshop,null);
        actionRow(body,"book","Total biaya",money(v.cost),null);
        actionRow(body,"book","Catatan",v.notes.isEmpty()?"Belum diisi":v.notes,null);
        button(body,"Ubah catatan",false,()->go("service",v.id));
    }
    private TextView dateField(LinearLayout parent,String value,boolean clearable,Consumer<String> update) {
        TextView t=text(value.isEmpty()?"Pilih tanggal":date(value),17,INK,true);
        t.setPadding(dp(16),dp(14),dp(16),dp(14));
        t.setMinHeight(dp(54));
        t.setBackground(bg(BG,LINE,12));
        parent.addView(t,new LinearLayout.LayoutParams(-1,-2));
        clickable(t,()-> {
            LocalDate d=value.isEmpty()?LocalDate.now():LocalDate.parse(value); DatePickerDialog picker=new DatePickerDialog(this,(view,y,m,day)->update.accept(LocalDate.of(y,m+1,day).toString()),d.getYear(),d.getMonthValue()-1,d.getDayOfMonth()); if(clearable)picker.setButton(DialogInterface.BUTTON_NEUTRAL,"Kosongkan",(dialog,which)->update.accept("")); picker.show();
        });
        return t;
    }
    private String val(EditText e) {
        return e.getText().toString().trim();
    }
    private String str(Long value) {
        return value==null?"":value.toString();
    }
    private void error(TextView error,Exception e) {
        error.setText(e instanceof IllegalArgumentException?e.getMessage():"Penyimpanan gagal. Periksa ruang penyimpanan, lalu coba Simpan lagi.");
        error.setVisibility(View.VISIBLE);
        error.announceForAccessibility(error.getText());
    }
    private TextView errorLabel() {
        TextView e=text("",15,0xffa13320,true);
        e.setVisibility(View.GONE);
        e.setPadding(0,dp(12),0,dp(12));
        body.addView(e);
        return e;
    }
    private void serviceForm() {
        Visit existing=entityId.isEmpty()?null:store.visit(entityId);
        Visit visit=existing==null?new Visit():existing;
        if(existing==null)visit.vehicleId=activeId;
        if(draft!=null) {
            visit.id=draft.getString("id",visit.id);
            visit.vehicleId=draft.getString("vehicle",visit.vehicleId);
            visit.date=draft.getString("date",visit.date);
            visit.created=draft.getString("created",visit.created);
            visit.jobs=draft.getStringArrayList("jobs");
            if(visit.jobs==null)visit.jobs=new ArrayList<>();
        }
        Vehicle motor=store.vehicle(visit.vehicleId);
        title(existing==null?"Catat servis":"Ubah catatan",motor==null?"Tambahkan kendaraan terlebih dahulu":motor.name);
        if(motor==null) {
            button(body,"Tambah kendaraan",true,()->go("vehicles",""));
            return;
        }
        final String[] selectedDate= {
            visit.date
        };
        label(body,"Tanggal servis");
        TextView dateText=dateField(body,visit.date,false,s-> {
            selectedDate[0]=s;
        });
        clickable(dateText,()-> {
            LocalDate d=LocalDate.parse(selectedDate[0]); DatePickerDialog picker=new DatePickerDialog(this,(p,y,m,day)-> {
                selectedDate[0]=LocalDate.of(y,m+1,day).toString(); dateText.setText(date(selectedDate[0]));
            },d.getYear(),d.getMonthValue()-1,d.getDayOfMonth()); picker.getDatePicker().setMaxDate(System.currentTimeMillis()); picker.show();
        });
        label(body,"Odometer (opsional)");
        EditText odometer=input(body,"Kilometer pada nota",draft==null?str(visit.km):draft.getString("km"),true);
        label(body,"Pekerjaan");
        LinkedHashMap<String,CheckBox> checks=new LinkedHashMap<>();
        LinkedHashSet<String> options=new LinkedHashSet<>(Arrays.asList(JOBS));
        options.addAll(visit.jobs);
        for(String job:options) {
            CheckBox cb=new CheckBox(this);
            cb.setText(job);
            cb.setTextSize(16);
            cb.setTextColor(INK);
            cb.setMinHeight(dp(52));
            cb.setPadding(dp(10),dp(4),dp(10),dp(4));
            cb.setChecked(visit.jobs.stream().anyMatch(j->Models.key(j).equals(Models.key(job))));
            checks.put(job,cb);
            body.addView(cb);
        }
        label(body,"Pekerjaan lain (opsional)");
        EditText custom=input(body,"Misalnya: setel rantai",draft==null?"":draft.getString("custom"),false);
        label(body,"Biaya (rupiah, opsional)");
        EditText cost=input(body,"Kosong = belum diisi, 0 = gratis",draft==null?str(visit.cost):draft.getString("cost"),true);
        label(body,"Bengkel (opsional)");
        EditText workshop=input(body,"Nama bengkel",draft==null?visit.workshop:draft.getString("workshop"),false);
        label(body,"Catatan (opsional)");
        EditText notes=input(body,"Catatan tambahan",draft==null?visit.notes:draft.getString("notes"),false);
        notes.setSingleLine(false);
        notes.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE|android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        notes.setMinLines(3);
        captureDraft=()-> {
            Bundle b=new Bundle();
            b.putString("id",visit.id);
            b.putString("vehicle",visit.vehicleId);
            b.putString("created",visit.created);
            b.putString("date",selectedDate[0]);
            b.putString("km",val(odometer));
            b.putString("cost",val(cost));
            b.putString("workshop",val(workshop));
            b.putString("notes",notes.getText().toString());
            b.putString("custom",val(custom));
            ArrayList<String> jobs=new ArrayList<>();
            checks.forEach((j,cb)-> {
                if(cb.isChecked())jobs.add(j);
            });
            b.putStringArrayList("jobs",jobs);
            draft=b;
        };
        TextView err=errorLabel();
        button(body,"✓  Simpan servis",true,()-> {
            try {
                visit.date=selectedDate[0]; visit.km=Models.number(val(odometer),"Odometer"); visit.cost=Models.number(val(cost),"Biaya"); visit.workshop=val(workshop); visit.notes=notes.getText().toString().trim(); visit.jobs=new ArrayList<>(); checks.forEach((j,cb)-> {
                    if(cb.isChecked())visit.jobs.add(j);
                }); if(!val(custom).isEmpty())visit.jobs.add(val(custom)); store.saveVisit(visit); setActive(visit.vehicleId); ReminderReceiver.evaluate(this); toast("Servis berhasil disimpan"); go("garage","");
            } catch(Exception e) {
                error(err,e);
            }
        });
        button(body,"Batal",false,this::onBackPressed);
    }
    private void reminderCard(Reminder r,LinearLayout parent) {
        Vehicle motor=store.vehicle(r.vehicleId);
        Status status=r.status(LocalDate.now(),motor.km);
        LinearLayout c=card(parent,BG,LINE);
        LinearLayout line=row();
        IconView icon=new IconView(this,r.component.toLowerCase(ID).contains("oli")?"oil":"bell",GOLD);
        line.addView(icon,new LinearLayout.LayoutParams(dp(29),dp(29)));
        TextView name=text(r.component,20,INK,true);
        LinearLayout.LayoutParams np=new LinearLayout.LayoutParams(0,-2,1);
        np.leftMargin=dp(13);
        line.addView(name,np);
        c.addView(line);
        space(c,12);
        String target=(r.date.isEmpty()?"":date(r.date))+(r.date.isEmpty()||r.km==null?"":" · ")+(r.km==null?"":km(r.km));
        c.addView(text(target,15,MUTED,false));
        space(c,9);
        TextView badge=text(status.label,13,status==Status.DUE?0xffa13320:GREEN,true);
        badge.setPadding(dp(10),dp(5),dp(10),dp(5));
        badge.setBackground(bg(status==Status.DUE?0xfffae5db:PALE,0,8));
        c.addView(badge,new LinearLayout.LayoutParams(-2,-2));
        clickable(c,()->go("reminder",r.id));
    }
    private void reminders() {
        title("Pengingat","Perawatan tepat waktu, perjalanan lebih tenang.");
        vehiclePicker(body,v-> {
            setActive(v.id); render();
        },activeId);
        if(active()==null) {
            empty(body,"Belum ada kendaraan","Tambahkan motor untuk membuat pengingat.");
            return;
        }
        space(body,12);
        List<Reminder> rs=store.reminders(activeId,true);
        if(rs.isEmpty())empty(body,"Belum ada pengingat aktif","Atur tanggal atau target kilometer untuk setiap komponen.");
        for(Reminder r:rs)reminderCard(r,body);
        button(body,"+  Tambah pengingat",true,()->go("reminder",""));
    }
    private void reminderForm() {
        Reminder saved=entityId.isEmpty()?null:store.reminder(entityId);
        Reminder r=saved==null?new Reminder():saved;
        if(saved==null)r.vehicleId=activeId;
        if(draft!=null) {
            r.id=draft.getString("id",r.id);
            r.vehicleId=draft.getString("vehicle",r.vehicleId);
            r.component=draft.getString("component",r.component);
            r.date=draft.getString("date",r.date);
            r.time=draft.getString("time",r.time);
        }
        title(saved==null?"Buat pengingat":"Ubah pengingat",null);
        if(store.vehicles().isEmpty()) {
            empty(body,"Tambahkan kendaraan dahulu","Pengingat akan disimpan untuk motor yang dipilih.");
            button(body,"Tambah kendaraan",true,()->go("vehicles",""));
            return;
        }
        final String[] vehicleId= {
            r.vehicleId
        },component= {
            r.component
        },targetDate= {
            r.date
        },time= {
            r.time
        };
        label(body,"Kendaraan");
        Vehicle motor=store.vehicle(r.vehicleId);
        TextView vehicleText=button(body,motor==null?"Pilih kendaraan":motor.name,false,()-> {
        });
        clickable(vehicleText,()-> {
            List<Vehicle> vs=store.vehicles(); new AlertDialog.Builder(this).setTitle("Pilih kendaraan").setItems(vs.stream().map(v->v.name+" · "+v.plate).toArray(String[]::new),(d,w)-> {
                vehicleId[0]=vs.get(w).id; vehicleText.setText(vs.get(w).name);
            }).setNegativeButton("Batal",null).show();
        });
        label(body,"Komponen / jenis servis");
        TextView componentText=button(body,r.component.isEmpty()?"Pilih komponen":r.component,false,()-> {
        });
        clickable(componentText,()->componentPicker(component[0],choice-> {
            component[0]=choice; componentText.setText(choice);
        }));
        label(body,"Tanggal pengingat (opsional)");
        TextView dateText=dateField(body,r.date,true,s-> {
        });
        clickable(dateText,()-> {
            LocalDate d=targetDate[0].isEmpty()?LocalDate.now():LocalDate.parse(targetDate[0]); DatePickerDialog picker=new DatePickerDialog(this,(v,y,m,day)-> {
                targetDate[0]=LocalDate.of(y,m+1,day).toString(); dateText.setText(date(targetDate[0]));
            },d.getYear(),d.getMonthValue()-1,d.getDayOfMonth()); picker.setButton(DialogInterface.BUTTON_NEUTRAL,"Kosongkan",(v,w)-> {
                targetDate[0]=""; dateText.setText("Pilih tanggal");
            }); picker.show();
        });
        label(body,"Target odometer (opsional)");
        EditText targetKm=input(body,"Contoh: 20000",draft==null?str(r.km):draft.getString("km"),true);
        label(body,"Pemberitahuan awal (hari)");
        EditText days=input(body,"0 sampai 365 hari sebelum tanggal",draft==null?String.valueOf(r.days):draft.getString("days"),true);
        label(body,"Waktu pemberitahuan tanggal");
        TextView clock=button(body,r.time,false,()-> {
        });
        clickable(clock,()-> {
            LocalTime t=LocalTime.parse(time[0]); new TimePickerDialog(this,(view,h,m)-> {
                time[0]=String.format(Locale.ROOT,"%02d:%02d",h,m); clock.setText(time[0]);
            },t.getHour(),t.getMinute(),true).show();
        });
        space(body,8);
        body.addView(text("Isi sedikitnya satu target. Pengingat tidak berubah otomatis setelah mencatat servis.",14,MUTED,false));
        captureDraft=()-> {
            Bundle b=new Bundle();
            b.putString("id",r.id);
            b.putString("vehicle",vehicleId[0]);
            b.putString("component",component[0]);
            b.putString("date",targetDate[0]);
            b.putString("time",time[0]);
            b.putString("km",val(targetKm));
            b.putString("days",val(days));
            draft=b;
        };
        TextView err=errorLabel();
        button(body,"✓  Simpan pengingat",true,()-> {
            try {
                Long early=Models.number(val(days),"Hari pemberitahuan"); if(early==null||early>365)throw new IllegalArgumentException("Isi pemberitahuan awal antara 0 dan 365 hari."); Long newKm=Models.number(val(targetKm),"Target kilometer"); boolean changed=!Objects.equals(r.km,newKm)||!r.date.equals(targetDate[0])||r.days!=early.intValue()||!r.time.equals(time[0])||!r.vehicleId.equals(vehicleId[0])||!r.component.equals(component[0]); r.vehicleId=vehicleId[0]; r.component=component[0]; r.date=targetDate[0]; r.km=newKm; r.days=early.intValue(); r.time=time[0]; r.active=true; if(changed)r.lastStatus=""; store.saveReminder(r); setActive(r.vehicleId); requestNotification(); ReminderReceiver.evaluate(this); toast("Pengingat disimpan"); go("reminders","");
            } catch(Exception e) {
                error(err,e);
            }
        });
        if(saved!=null)button(body,"Nonaktifkan pengingat",false,()->new AlertDialog.Builder(this).setTitle("Nonaktifkan pengingat?").setMessage("Pengingat komponen ini akan berhenti mengirim pemberitahuan.").setNegativeButton("Batal",null).setPositiveButton("Nonaktifkan",(d,w)-> {
            try {
                Reminder persisted=store.reminder(r.id); persisted.active=false; store.saveReminder(persisted); ReminderReceiver.evaluate(this); go("reminders","");
            } catch(Exception e) {
                error(err,e);
            }
        }).show());
        button(body,"Batal",false,this::onBackPressed);
    }
    private void componentPicker(String original,Consumer<String> done) {
        LinearLayout layout=column();
        layout.setPadding(dp(18),dp(10),dp(18),dp(10));
        EditText search=input(layout,"Cari komponen","",false);
        ScrollView listScroll=new ScrollView(this);
        RadioGroup group=new RadioGroup(this);
        listScroll.addView(group);
        layout.addView(listScroll,new LinearLayout.LayoutParams(-1,dp(320)));
        String[] selected= {
            original
        };
        Runnable fill=()-> {
            group.removeAllViews();
            for(String value:COMPONENTS) {
                if(!Models.key(value).contains(Models.key(val(search))))continue;
                RadioButton rb=new RadioButton(this);
                rb.setText(value);
                rb.setTextColor(INK);
                rb.setTextSize(17);
                rb.setMinHeight(dp(52));
                rb.setChecked(value.equals(selected[0]));
                rb.setOnClickListener(v->selected[0]=value);
                group.addView(rb);
            }
            if(group.getChildCount()==0) {
                TextView e=text("Komponen tidak ditemukan",15,MUTED,false);
                group.addView(e);
            }
        };
        fill.run();
        search.addTextChangedListener(watcher(s->fill.run()));
        AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Pilih komponen").setView(layout).setNegativeButton("Batal",null).setPositiveButton("Gunakan pilihan",null).create();
        dialog.setOnShowListener(d->dialog.getButton(-1).setOnClickListener(v-> {
            if(!selected[0].isEmpty()) {
                done.accept(selected[0]); dialog.dismiss();
            } else toast("Pilih satu komponen terlebih dahulu");
        }));
        dialog.show();
    }
    private void vehicles() {
        title("Kendaraan saya","Satu buku servis untuk setiap motor Anda.");
        for(Vehicle v:store.vehicles()) {
            boolean selected=v.id.equals(activeId);
            LinearLayout c=card(body,selected?PALE:BG,selected?GREEN:LINE);
            c.addView(text((selected?"✓  ":"")+v.name,23,GREEN,true));
            space(c,6);
            c.addView(text(v.plate,16,MUTED,true));
            space(c,10);
            c.addView(text(km(v.km),20,INK,true));
            if(selected)motorcycle(c,136);
            button(c,selected?"Perbarui kilometer":"Pilih kendaraan",selected,()-> {
                if(selected)odometerDialog(v); else {
                    setActive(v.id); render();
                }
            });
        }
        button(body,"+  Tambah kendaraan",false,this::vehicleDialog);
    }
    private void vehicleDialog() {
        LinearLayout l=column();
        l.setPadding(dp(20),dp(8),dp(20),dp(12));
        label(l,"Nama kendaraan");
        EditText name=input(l,"Contoh: Vario Biru Tua","",false);
        label(l,"Pelat nomor");
        EditText plate=input(l,"Contoh: W 6299 BY","",false);
        plate.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS);
        label(l,"Odometer awal (opsional)");
        EditText km=input(l,"Kilometer saat ini","",true);
        TextView err=text("",14,0xffa13320,false);
        l.addView(err);
        ScrollView container=new ScrollView(this);
        container.addView(l);
        Vehicle v=new Vehicle();
        AlertDialog d=new AlertDialog.Builder(this).setTitle("Tambah kendaraan").setView(container).setNegativeButton("Batal",null).setPositiveButton("Simpan",null).create();
        d.setOnShowListener(dialog->d.getButton(-1).setOnClickListener(view-> {
            try {
                v.name=val(name); v.plate=val(plate); v.km=Models.number(val(km),"Odometer"); store.saveVehicle(v); setActive(v.id); d.dismiss(); render();
            } catch(Exception e) {
                error(err,e);
            }
        }));
        d.show();
    }
    private void odometerDialog(Vehicle vehicle) {
        LinearLayout l=column();
        l.setPadding(dp(20),dp(10),dp(20),dp(12));
        l.addView(text("Pembacaan terakhir: "+km(vehicle.km),16,MUTED,false));
        space(l,14);
        EditText value=input(l,"Odometer baru",str(vehicle.km),true);
        TextView err=text("",14,0xffa13320,false);
        l.addView(err);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("Perbarui kilometer").setView(l).setNegativeButton("Batal",null).setPositiveButton("Simpan",null).create();
        d.setOnShowListener(dialog->d.getButton(-1).setOnClickListener(view-> {
            try {
                Long n=Models.number(val(value),"Odometer"); if(n==null)throw new IllegalArgumentException("Isi pembacaan odometer baru."); Vehicle updated=store.vehicle(vehicle.id); updated.km=n; store.saveVehicle(updated); ReminderReceiver.evaluate(this); d.dismiss(); render();
            } catch(Exception e) {
                error(err,e);
            }
        }));
        d.show();
    }
    private void settings() {
        title("Pengaturan",null);
        actionRow(body,"person",store.pref("profile","Riyan"),"Profil lokal · tersimpan di perangkat",this::profileDialog);
        label(body,"SERVIS");
        Switch toggle=new Switch(this);
        toggle.setText("Pengingat servis");
        toggle.setTextSize(17);
        toggle.setTextColor(INK);
        toggle.setMinHeight(dp(56));
        toggle.setChecked(store.pref("notifications","true").equals("true"));
        body.addView(toggle);
        toggle.setOnCheckedChangeListener((v,on)-> {
            try {
                store.setPref("notifications",String.valueOf(on)); if(on)requestNotification(); ReminderReceiver.evaluate(this);
            } catch(Exception e) {
                toast("Pengaturan gagal disimpan. Coba lagi.");
            }
        });
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) {
            space(body,6);
            body.addView(text("Izin notifikasi belum aktif. Daftar pengingat tetap dapat digunakan.",14,MUTED,false));
            button(body,"Izinkan notifikasi",false,()-> {
                store.setPref("notifications","true"); requestNotification();
            });
        }
        label(body,"RIWAYAT");
        actionRow(body,"download","Ekspor riwayat (CSV)","Semua kendaraan dan catatan servis",this::startExport);
        actionRow(body,"upload","Impor riwayat (CSV)","Pulihkan catatan dari berkas ekspor",this::startImport);
        label(body,"LAINNYA");
        actionRow(body,"km","Kendaraan saya","Tambah motor dan perbarui kilometer",()->go("vehicles",""));
        actionRow(body,"help","Bantuan","Panduan penggunaan dan pemulihan",this::help);
        space(body,16);
        body.addView(text("Buku Servis Motor 1.0.0\nData disimpan di ruang privat aplikasi. Ekspor CSV secara berkala untuk menyimpan salinan riwayat Anda.",13,MUTED,false));
    }
    private void profileDialog() {
        LinearLayout l=column();
        l.setPadding(dp(20),dp(8),dp(20),dp(8));
        EditText name=input(l,"Nama profil",store.pref("profile","Riyan"),false);
        AlertDialog d=new AlertDialog.Builder(this).setTitle("Profil lokal").setView(l).setNegativeButton("Batal",null).setPositiveButton("Simpan",null).create();
        d.setOnShowListener(v->d.getButton(-1).setOnClickListener(w-> {
            if(val(name).isEmpty()) {
                name.setError("Nama wajib diisi"); return;
            }
            try {
                store.setPref("profile",val(name)); d.dismiss(); render();
            } catch(Exception e) {
                name.setError("Gagal menyimpan. Coba lagi.");
            }
        }));
        d.show();
    }
    private void requestNotification() {
        if(store.pref("notifications","true").equals("true")&&Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[] {
            Manifest.permission.POST_NOTIFICATIONS
        },12);
    }
    @Override public void onRequestPermissionsResult(int requestCode,String[] permissions,int[] results) {
        super.onRequestPermissionsResult(requestCode,permissions,results);
        ReminderReceiver.evaluate(this);
        if(screen.equals("settings"))render();
    }
    private void help() {
        new AlertDialog.Builder(this).setTitle("Bantuan Buku Servis").setMessage("1. Tambahkan motor melalui Kendaraan saya. Pelat harus unik.\n\n2. Pilih motor di Garasi, ketuk Catat servis, isi tanggal dan minimal satu pekerjaan, lalu Simpan. Nota lama boleh dicatat; servis terbaru tetap ditentukan oleh tanggal kunjungan.\n\n3. Buka Riwayat, lalu cari nama pekerjaan (misalnya OLI) atau bengkel. Ketuk hasil untuk melihat atau mengubah rincian.\n\n4. Buat pengingat per komponen. Isi tanggal dan/atau target kilometer. Perbarui odometer secara manual agar target km dapat dievaluasi. Jatuh tempo berarti salah satu target sudah tercapai. Waktu pemberitahuan dapat bergeser karena penghemat baterai Android.\n\n5. Ekspor CSV melalui Pengaturan dan pilih lokasi berkas. Untuk memulihkan, pilih Impor CSV dan buka berkas ekspor. Catatan identik dilewati; CSV rusak dibatalkan seluruhnya.\n\nCSV hanya mencakup riwayat dan kendaraan terkait. Pengingat, profil, serta kendaraan tanpa riwayat tidak disertakan. Simpan berkas ekspor sebelum mencopot aplikasi karena data lokal ikut terhapus.").setPositiveButton("Mengerti",null).show();
    }
    private void toast(String message) {
        Toast.makeText(this,message,Toast.LENGTH_LONG).show();
    }
    private void startExport() {
        try {
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("text/csv").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"buku-servis-"+LocalDate.now()+".csv");
            startActivityForResult(intent,41);
        } catch(Exception e) {
            toast("Ekspor gagal: "+e.getMessage());
        }
    }
    private void startImport() {
        if(importing) {
            toast("Impor masih diproses");
            return;
        }
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);
        startActivityForResult(intent,42);
    }
    @Override protected void onActivityResult(int code,int result,Intent data) {
        super.onActivityResult(code,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null) {
            return;
        }
        android.net.Uri uri=data.getData();
        if(code==41) {
            io.execute(()-> {
                try(Store exportStore=new Store(getApplicationContext())) {
                    String content;
                    int count;
                    android.database.sqlite.SQLiteDatabase db=exportStore.getWritableDatabase();
                    db.beginTransaction();
                    try {
                        content=exportStore.exportCsv();
                        count=exportStore.visits(null,"").size();
                        db.setTransactionSuccessful();
                    } finally { db.endTransaction(); }
                    try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")) {
                        if(out==null)throw new IOException("Lokasi tidak dapat ditulis");
                        out.write(content.getBytes(StandardCharsets.UTF_8));
                    }
                    runOnUiThread(()-> {
                        if(!destroyed)toast(count+" kunjungan berhasil diekspor");
                    });
                } catch(Exception e) {
                    runOnUiThread(()-> {
                        if(!destroyed)toast("Ekspor gagal. Periksa lokasi penyimpanan dan coba lagi.");
                    });
                }
            });
        }
        if(code==42) {
            importing=true;
            toast("Memeriksa berkas CSV…");
            io.execute(()-> {
                try(InputStream in=getContentResolver().openInputStream(uri)) {
                    if(in==null)throw new IOException("Berkas tidak dapat dibuka"); ByteArrayOutputStream bytes=new ByteArrayOutputStream(); byte[] buffer=new byte[8192]; int n; while((n=in.read(buffer))!=-1) {
                        if(bytes.size()+n>20*1024*1024)throw new IllegalArgumentException("Berkas maksimal 20 MB."); bytes.write(buffer,0,n);
                    }
                    String csv=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes.toByteArray())).toString(); Store.ImportResult imported=store.importCsv(csv); ReminderReceiver.evaluate(this); runOnUiThread(()-> {
                        if(!destroyed) {
                            if(captureDraft!=null)captureDraft.run(); ensureActive(); render(); new AlertDialog.Builder(this).setTitle("Impor selesai").setMessage(imported.imported+" kunjungan diimpor.\n"+imported.skipped+" kunjungan identik dilewati.").setPositiveButton("Selesai",null).show();
                        }
                    });
                } catch(Exception e) {
                    runOnUiThread(()-> {
                        if(!destroyed)new AlertDialog.Builder(this).setTitle("Impor dibatalkan").setMessage(e instanceof IllegalArgumentException?e.getMessage():e instanceof CharacterCodingException?"Berkas harus menggunakan UTF-8.":"Berkas tidak dapat dibaca atau disimpan. Periksa berkas dan ruang penyimpanan, lalu coba lagi.").setPositiveButton("Mengerti",null).show();
                    });
                } finally {
                    importing=false; if(destroyed)store.close();
                }
            });
        }
    }
}
