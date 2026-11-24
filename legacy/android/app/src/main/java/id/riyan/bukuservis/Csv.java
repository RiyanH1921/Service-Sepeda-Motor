package id.riyan.bukuservis;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
/** RFC 4180 quoting, strict column/quote validation and physical line diagnostics. */
public final class Csv {
    public static final List<String> HEADER = Arrays.asList("id_servis", "id_kendaraan", "nama_kendaraan", "pelat", "tanggal_servis", "dibuat_pada", "pekerjaan", "odometer_km", "biaya_rp", "bengkel", "catatan");
    public static class Row {
        public final int line;
        public final List<String> fields;
        Row(int line, List<String> fields) {
            this.line = line;
            this.fields = fields;
        }
    }
    private Csv() {
    }
    public static String row(List<String> fields) {
        List<String> escaped = new ArrayList<>();
        for (String f : fields) {
            if (f == null) f = "";
            escaped.add(f.contains(",") || f.contains("\"") || f.contains("\n") || f.contains("\r") ? "\"" + f.replace("\"", "\"\"") + "\"" : f);
        }
        return String.join(",", escaped) + "\r\n";
    }
    public static List<Row> parse(String input) {
        if (input.startsWith("\uFEFF")) input = input.substring(1);
        List<Row> rows = new ArrayList<>();
        List<String> fields = new ArrayList<>();
        StringBuilder field = new StringBuilder();
        boolean quoted = false, closed = false, touched = false;
        int line = 1, start = 1;
        for (int i = 0; i < input.length(); i++) {
            char c = input.charAt(i);
            touched = true;
            if (quoted) {
                if (c == '"') {
                    if (i + 1 < input.length() && input.charAt(i + 1) == '"') {
                        field.append('"');
                        i++;
                    } else {
                        quoted = false;
                        closed = true;
                    }
                } else {
                    field.append(c);
                    if (c == '\n' || (c == '\r' && (i+1 == input.length() || input.charAt(i+1) != '\n'))) line++;
                }
            } else if (c == ',') {
                fields.add(field.toString());
                field.setLength(0);
                closed = false;
            } else if (c == '\n' || c == '\r') {
                fields.add(field.toString());
                rows.add(new Row(start, fields));
                fields = new ArrayList<>();
                field.setLength(0);
                closed = false;
                touched = false;
                if (c == '\r' && i + 1 < input.length() && input.charAt(i+1) == '\n') i++;
                start = ++line;
            } else if (c == '"' && field.length() == 0 && !closed) quoted = true;
            else if (closed || c == '"') throw error(line, "tanda kutip tidak valid");
            else field.append(c);
        }
        if (quoted) throw error(start, "tanda kutip belum ditutup");
        if (touched) {
            fields.add(field.toString());
            rows.add(new Row(start, fields));
        }
        if (rows.isEmpty() || !rows.get(0).fields.equals(HEADER)) throw error(1, "judul kolom harus sesuai format Buku Servis");
        for (int i = 1; i < rows.size(); i++) if (rows.get(i).fields.size() != HEADER.size()) throw error(rows.get(i).line, "jumlah kolom harus 11");
        return rows;
    }
    public static IllegalArgumentException error(int line, String reason) {
        return new IllegalArgumentException("Baris " + line + ": " + reason + ".");
    }
}
