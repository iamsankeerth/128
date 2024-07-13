class AlternatePrime{
    public static void main(String[] args) {
       int limiy=20;
       int count =0;
       for(int i=2;i<=limiy;i++){
           if(prime(i)){
               if(count%2==0){
                   System.out.println(i);
               }
               count++;
           }
       }
    }
    public static boolean prime(int num){
        int count2=0;
        int x=num;
        for(int i=1;i<=num;i++){
            if(x%i==0){
                count2++;
            }
        }
        if(count2==2){
            return true;
        }
        else{
            return false;
        }
    }
}