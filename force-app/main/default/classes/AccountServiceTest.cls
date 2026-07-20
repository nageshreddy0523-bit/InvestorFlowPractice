@isTest
private class AccountServiceTest {

    @isTest
    static void testCreateAccount() {
        Test.startTest();
        Account acc = AccountService.createAccount('Test Corp', 'Technology');
        Test.stopTest();

        System.assertNotEquals(null, acc.Id, 'Account should be inserted');
        System.assertEquals('Test Corp', acc.Name);
        System.assertEquals('Technology', acc.Industry);
    }

    @isTest
    static void testCreateAccountBlankName() {
        try {
            AccountService.createAccount('', 'Technology');
            System.assert(false, 'Should have thrown exception');
        } catch (AccountService.AccountServiceException e) {
            System.assert(e.getMessage().contains('cannot be blank'));
        }
    }

    @isTest
    static void testGetAccountsByIndustry() {
        Account acc1 = new Account(Name = 'Alpha Inc', Industry = 'Finance');
        Account acc2 = new Account(Name = 'Beta LLC', Industry = 'Finance');
        Account acc3 = new Account(Name = 'Gamma Co', Industry = 'Technology');
        insert new List<Account>{ acc1, acc2, acc3 };

        Test.startTest();
        List<Account> results = AccountService.getAccountsByIndustry('Finance');
        Test.stopTest();

        System.assertEquals(2, results.size());
    }

    @isTest
    static void testUpdateAccountIndustry() {
        Account acc = new Account(Name = 'Delta Corp', Industry = 'Finance');
        insert acc;

        Test.startTest();
        Account updated = AccountService.updateAccountIndustry(acc.Id, 'Healthcare');
        Test.stopTest();

        System.assertEquals('Healthcare', updated.Industry);
    }

    @isTest
    static void testCountAccountsByIndustry() {
        insert new List<Account>{
            new Account(Name = 'A1', Industry = 'Energy'),
            new Account(Name = 'A2', Industry = 'Energy'),
            new Account(Name = 'A3', Industry = 'Retail')
        };

        Test.startTest();
        Integer count = AccountService.countAccountsByIndustry('Energy');
        Test.stopTest();

        System.assertEquals(2, count);
    }
}
