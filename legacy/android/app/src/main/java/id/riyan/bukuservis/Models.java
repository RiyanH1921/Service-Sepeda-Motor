package id.riyan.bukuservis;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
public final class Models {
    private Models() {
    }
    public static String id() {
        return UUID.randomUUID().toString();
    }
    public static String plateKey(String plate) {
        return plate.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }
    public static String key(String text) {
        return text.trim().toLowerCase(Locale.ROOT);
    }
    public static Long number(String text, String label) {
        if (text.trim().isEmpty()) return null;
        try {
            long n = Long.parseLong(text.trim());
            if (n < 0) throw new NumberFormatException();
            return n;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException(label + " harus bilangan bulat 0 atau lebih.");
        }
    }
    public static class Vehicle {
        public String id, name = "", plate = "";
        public Long km;
        public Vehicle() { this(true); }
        Vehicle(boolean fresh) { id=fresh?Models.id():""; }
    }
    public static class Visit {
        public String id, vehicleId, date;
        public String created, workshop = "", notes = "";
        public Long km, cost;
        public List<String> jobs = new ArrayList<>();
        public Visit() { this(true); }
        Visit(boolean fresh) {
            id=fresh?Models.id():"";
            date=fresh?LocalDate.now().toString():"";
            created=fresh?OffsetDateTime.now().toString():"";
        }
        public void validate(LocalDate today) {
            if (vehicleId == null || vehicleId.trim().isEmpty()) throw new IllegalArgumentException("Pilih kendaraan terlebih dahulu.");
            try {
                if (LocalDate.parse(date).isAfter(today)) throw new IllegalArgumentException("Tanggal servis tidak boleh di masa depan.");
            } catch (java.time.format.DateTimeParseException e) {
                throw new IllegalArgumentException("Tanggal servis tidak valid.");
            }
            try {
                OffsetDateTime.parse(created);
            } catch (RuntimeException e) {
                throw new IllegalArgumentException("Waktu dibuat harus ISO 8601 dengan zona waktu.");
            }
            if (jobs.isEmpty() || jobs.stream().anyMatch(j -> j == null || j.trim().isEmpty())) throw new IllegalArgumentException("Pilih sedikitnya satu pekerjaan.");
            if ((km != null && km < 0) || (cost != null && cost < 0)) throw new IllegalArgumentException("Kilometer dan biaya tidak boleh negatif.");
        }
    }
    public enum Status {
        DUE("Jatuh tempo"), NEAR("Mendekati"), SCHEDULED("Terjadwal"), NO_KM("Perlu data km");
        public final String label;
        Status(String label) {
            this.label = label;
        }
    }
    public static class Reminder {
        public String id, vehicleId, component = "", date = "", time = "08:00", lastStatus = "";
        public Long km;
        public int days = 7;
        public boolean active = true;
        public Reminder() { this(true); }
        Reminder(boolean fresh) { id=fresh?Models.id():""; }
        public Status status(LocalDate today, Long currentKm) {
            if ((!date.isEmpty() && !today.isBefore(LocalDate.parse(date))) || (km != null && currentKm != null && currentKm >= km)) return Status.DUE;
            if (!date.isEmpty() && !today.isBefore(LocalDate.parse(date).minusDays(days))) return Status.NEAR;
            if (km != null && currentKm == null) return Status.NO_KM;
            return Status.SCHEDULED;
        }
        public void validate() {
            if (vehicleId == null || component.trim().isEmpty()) throw new IllegalArgumentException("Pilih kendaraan dan komponen.");
            if (date.isEmpty() && km == null) throw new IllegalArgumentException("Isi tanggal atau target kilometer.");
            if (!date.isEmpty()) LocalDate.parse(date);
            java.time.LocalTime.parse(time);
            if (days < 0 || days > 365 || (km != null && km < 0)) throw new IllegalArgumentException("Target atau hari pemberitahuan tidak valid.");
        }
    }
}
