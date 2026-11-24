package id.riyan.bukuservis;
import org.junit.Test;
import java.time.LocalDate;
import java.util.*;
import static org.junit.Assert.*;
import static id.riyan.bukuservis.Models.*;
public class DomainTest {
    @Test public void csvEscapesCommaQuotesAndNewlines() {
        List<String> fields=Arrays.asList("s1","v1","Motor, biru","B 1 XX","2026-08-10","2026-08-10T12:00:00+07:00","Ganti oli mesin","12000","0","Bengkel \"A\"","Baris 1\r\nBaris 2");
        List<Csv.Row> parsed=Csv.parse("\uFEFF"+Csv.row(Csv.HEADER)+Csv.row(fields));
        assertEquals(fields,parsed.get(1).fields);
        assertEquals(2,parsed.get(1).line);
    }
    @Test public void csvRejectsBrokenQuotes() {
        assertThrows(IllegalArgumentException.class,()->Csv.parse(Csv.row(Csv.HEADER)+"\"unclosed"));
    }
    @Test public void csvRejectsExtraCharactersAfterQuote() {
        assertThrows(IllegalArgumentException.class,()->Csv.parse(Csv.row(Csv.HEADER)+"\"id\"x,1\n"));
    }
    @Test public void csvRejectsWrongColumnCount() {
        assertThrows(IllegalArgumentException.class,()->Csv.parse(Csv.row(Csv.HEADER)+"s1,v1\n"));
    }
    @Test public void csvReportsPhysicalLineAfterMultiline() {
        List<String> row=new ArrayList<>(Arrays.asList("1","2","3","4","5","6","7","8","9","10","a\nb"));
        List<Csv.Row> parsed=Csv.parse(Csv.row(Csv.HEADER)+Csv.row(row)+Csv.row(row));
        assertEquals(4,parsed.get(2).line);
    }
    @Test public void zeroAndMissingDiffer() {
        assertNull(Models.number("","Biaya"));
        assertEquals(Long.valueOf(0),Models.number("0","Biaya"));
        assertThrows(IllegalArgumentException.class,()->Models.number("-1","Biaya"));
        assertThrows(IllegalArgumentException.class,()->Models.number("12.5","Odometer"));
    }
    @Test public void plateNormalization() {
        assertEquals(Models.plateKey("w 6299 by"),Models.plateKey("W6299BY"));
    }
    @Test public void visitsRejectFutureOrNoJobs() {
        Visit v=new Visit();
        v.vehicleId="v1";
        v.date="2026-11-19";
        assertThrows(IllegalArgumentException.class,()->v.validate(LocalDate.of(2026,11,19)));
        v.jobs.add("Ganti oli");
        v.validate(LocalDate.of(2026,11,19));
        assertThrows(IllegalArgumentException.class,()->v.validate(LocalDate.of(2026,11,18)));
    }
    @Test public void reminderJanuaryBoundaries() {
        Reminder r=new Reminder();
        r.date="2027-01-18";
        r.days=7;
        assertEquals(Status.SCHEDULED,r.status(LocalDate.of(2027,1,10),null));
        assertEquals(Status.NEAR,r.status(LocalDate.of(2027,1,11),null));
        assertEquals(Status.DUE,r.status(LocalDate.of(2027,1,18),null));
    }
    @Test public void reminderKmBoundaryAndMissingReading() {
        Reminder r=new Reminder();
        r.km=16500L;
        assertEquals(Status.NO_KM,r.status(LocalDate.now(),null));
        assertEquals(Status.SCHEDULED,r.status(LocalDate.now(),16499L));
        assertEquals(Status.DUE,r.status(LocalDate.now(),16500L));
    }
    @Test public void eitherTargetWins() {
        Reminder r=new Reminder();
        r.date="2027-01-18";
        r.km=16500L;
        assertEquals(Status.DUE,r.status(LocalDate.of(2027,1,1),16500L));
        assertEquals(Status.NEAR,r.status(LocalDate.of(2027,1,11),16000L));
        assertEquals(Status.DUE,r.status(LocalDate.of(2027,1,18),16000L));
    }
    @Test public void missingKmStillShowsDateUrgency() {
        Reminder r=new Reminder();
        r.date="2027-01-18";
        r.km=16500L;
        assertEquals(Status.NO_KM,r.status(LocalDate.of(2027,1,1),null));
        assertEquals(Status.NEAR,r.status(LocalDate.of(2027,1,11),null));
        assertEquals(Status.DUE,r.status(LocalDate.of(2027,1,18),null));
    }
    @Test public void reminderRequiresTarget() {
        Reminder r=new Reminder();
        r.vehicleId="v1";
        r.component="Oli mesin";
        assertThrows(IllegalArgumentException.class,r::validate);
        r.km=0L;
        r.validate();
    }
}
