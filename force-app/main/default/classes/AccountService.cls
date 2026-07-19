public with sharing class AccountService {

    public static final String NAMESPACE = '__NAMESPACE__';
    public static final String NAMESPACE_PREFIX = '__NAMESPACE_PREFIX__';

    public static Account createAccount(String name, String industry) {
        if (String.isBlank(name)) {
            throw new AccountServiceException('Account name cannot be blank');
        }

        Account acc = new Account(
            Name = name,
            Industry = industry
        );
        insert acc;
        return acc;
    }

    public static List<Account> getAccountsByIndustry(String industry) {
        return [
            SELECT Id, Name, Industry, CreatedDate
            FROM Account
            WHERE Industry = :industry
            ORDER BY Name
        ];
    }

    public static Account updateAccountIndustry(Id accountId, String newIndustry) {
        Account acc = [SELECT Id, Name, Industry FROM Account WHERE Id = :accountId LIMIT 1];
        acc.Industry = newIndustry;
        update acc;
        return acc;
    }

    public static Integer countAccountsByIndustry(String industry) {
        return [SELECT COUNT() FROM Account WHERE Industry = :industry];
    }

    public class AccountServiceException extends Exception {}
}
