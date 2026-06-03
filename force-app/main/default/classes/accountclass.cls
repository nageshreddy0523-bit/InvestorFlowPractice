public class accountclass {
    public static void accountmethod(){
        account acc = new account();
        acc.Name = 'Repu';
        acc.Phone = '7654345678';
        insert acc;
        system.debug(acc);
    }
    public void casemethod(){
        case ca = new case();
        ca.Origin ='phone';
        ca.Product__c = 'gc1040';
        insert ca;
        system.debug(ca);
    }
        

}