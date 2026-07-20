@isTest
private class ContactUtilsTest {

    @TestSetup
    static void setup() {
        Account acc = new Account(Name = 'Test Account');
        insert acc;
    }

    static Account getTestAccount() {
        return [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1];
    }

    @isTest
    static void testCreateContact() {
        Account acc = getTestAccount();

        Test.startTest();
        Contact con = ContactUtils.createContact('John', 'Doe', acc.Id);
        Test.stopTest();

        System.assertNotEquals(null, con.Id);
        System.assertEquals('John', con.FirstName);
        System.assertEquals('Doe', con.LastName);
        System.assertEquals(acc.Id, con.AccountId);
    }

    @isTest
    static void testCreateContactBlankLastName() {
        Account acc = getTestAccount();

        try {
            ContactUtils.createContact('John', '', acc.Id);
            System.assert(false, 'Should have thrown exception');
        } catch (ContactUtils.ContactUtilsException e) {
            System.assert(e.getMessage().contains('Last name is required'));
        }
    }

    @isTest
    static void testGetContactsByAccount() {
        Account acc = getTestAccount();
        insert new List<Contact>{
            new Contact(FirstName = 'A', LastName = 'Smith', AccountId = acc.Id),
            new Contact(FirstName = 'B', LastName = 'Jones', AccountId = acc.Id)
        };

        Test.startTest();
        List<Contact> contacts = ContactUtils.getContactsByAccount(acc.Id);
        Test.stopTest();

        System.assertEquals(2, contacts.size());
    }

    @isTest
    static void testDeleteContactsByAccount() {
        Account acc = getTestAccount();
        insert new List<Contact>{
            new Contact(FirstName = 'X', LastName = 'Delete1', AccountId = acc.Id),
            new Contact(FirstName = 'Y', LastName = 'Delete2', AccountId = acc.Id)
        };

        Test.startTest();
        ContactUtils.deleteContactsByAccount(acc.Id);
        Test.stopTest();

        List<Contact> remaining = [SELECT Id FROM Contact WHERE AccountId = :acc.Id];
        System.assertEquals(0, remaining.size());
    }
}
