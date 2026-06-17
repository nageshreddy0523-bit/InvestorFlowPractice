/**
 * Service class responsible for processing fund distributions to Limited Partners (LPs).
 */
public with sharing class FundDistributionService {

    /**
     * Processes distributions for the given list of funds.
     * @param funds List of Account records representing funds.
     */
    public void processFundDistributions(List<Account> funds) {

        Id lpRecordTypeId = Schema.SObjectType.Contact.getRecordTypeInfosByDeveloperName().get('LP').getRecordTypeId();

        Set<Id> fundIds = new Set<Id>();
        for (Account fund : funds) {
            fundIds.add(fund.Id);
        }

        List<Contact> lpsToUpdate = new List<Contact>();

        if (Schema.sObjectType.Contact.isQueryable()) {
            List<Contact> lps = [SELECT Id, Name FROM Contact WHERE AccountId IN :fundIds WITH USER_MODE];

            for (Contact lp : lps) {
                lp.Description = 'Distribution processed';
                lpsToUpdate.add(lp);
            }
        }

        if (!lpsToUpdate.isEmpty() && Schema.sObjectType.Contact.isUpdateable()) {
            Database.update(lpsToUpdate, AccessLevel.USER_MODE);
        }
    }
}