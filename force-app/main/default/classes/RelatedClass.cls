public class RelatedClass {
    public static void RelatedMethod(){
        Account acc=New Account();
        acc.Name='pream';
        acc.Rating='hot';
        insert acc;
       contact con=New contact();
        con.LastName='nari';
        con.AccountId=acc.Id;
        insert con;
        system.debug(acc);
        system.debug(con);
    }

}