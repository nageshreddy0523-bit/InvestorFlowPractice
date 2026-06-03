public class EmailManager {

    public static void sendMail(String subject, String body, List<String> toAddresses) {
        Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
        mail.setToAddresses(toAddresses);
        mail.setSubject(subject);
        mail.setPlainTextBody(body);

        // Send the email
        Messaging.SendEmailResult[] results = Messaging.sendEmail(new Messaging.SingleEmailMessage[] { mail });

        // Inspect the results
        inspectResults(results);
    }

    private static void inspectResults(Messaging.SendEmailResult[] results) {
        for (Messaging.SendEmailResult res : results) {
            if (res.isSuccess()) {
                System.debug('Email sent successfully.');
            } else {
                System.debug('Failed to send email: ' + res.getErrors()[0].getMessage());
            }
        }
    }
}