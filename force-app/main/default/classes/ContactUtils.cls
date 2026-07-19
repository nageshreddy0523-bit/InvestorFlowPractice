public with sharing class ContactUtils {

    public static final String PKG_NAMESPACE = '__NAMESPACE__';

    public static Contact createContact(String firstName, String lastName, Id accountId) {
        if (String.isBlank(lastName)) {
            throw new ContactUtilsException('Last name is required');
        }

        Contact con = new Contact(
            FirstName = firstName,
            LastName = lastName,
            AccountId = accountId
        );
        insert con;
        return con;
    }

    public static List<Contact> getContactsByAccount(Id accountId) {
        return [
            SELECT Id, FirstName, LastName, Email, AccountId
            FROM Contact
            WHERE AccountId = :accountId
            ORDER BY LastName
        ];
    }

    public static void deleteContactsByAccount(Id accountId) {
        List<Contact> contacts = [SELECT Id FROM Contact WHERE AccountId = :accountId];
        if (!contacts.isEmpty()) {
            delete contacts;
        }
    }

    public class ContactUtilsException extends Exception {}
}
