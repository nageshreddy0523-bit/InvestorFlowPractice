public class ObjectExample 
{
    public static void AccountMethod()
    {
        Account acc = New Account();
        acc.Name = 'FLM';
        acc.Phone = '9876987600';
        acc.Fax = '786876';
        acc.Rating = 'Cold';
        
        
        system.debug(acc);
        insert acc;
        
    }
    public void ContactMethod()
    {
        contact con = new contact();
        con.LastName = 'Paul';
        
        system.debug(con);
        insert con;
    }

}