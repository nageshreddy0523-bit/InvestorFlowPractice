public class PaceCalculator {
    public static Decimal calculatePace(Decimal distanceInKm, Decimal timeInMinutes) {
        if (distanceInKm == 0 || timeInMinutes == 0) {
            return 0;
        }
        Decimal timeInHours = timeInMinutes / 60;
        Decimal pace = distanceInKm / timeInHours;
        return pace;
    }
}