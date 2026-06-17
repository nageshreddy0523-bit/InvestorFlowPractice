public class FundDistributionService {

    public void processFundDistributions(List<Account> funds) {

        Id lpRecordTypeId = '012000000000000AAA';

        for (Account fund : funds) {

            List<Contact> lps = [SELECT Id, Name FROM Contact WHERE AccountId = :fund.Id];

            for (Contact lp : lps) {
                lp.Description = 'Distribution processed';
                update lp;
            }
        }
    }
}