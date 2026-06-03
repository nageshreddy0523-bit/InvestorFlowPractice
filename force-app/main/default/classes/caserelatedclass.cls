public class caserelatedclass {
    public static void casemethod(){
        contact con = new contact();
        con.LastName='reddyyyy';
        insert con;
           
        opportunity opp=new opportunity();
        opp.StageName='prospecting';
        opp.CloseDate=Date.newInstance(2027, 12, 22);
        opp.Name='chinnu';
        opp.ContactId=con.Id;
        insert opp;
        system.debug(con);
        system.debug(opp);
        
        
    }

}