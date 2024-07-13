// Online Java Compiler
// Use this editor to write, compile and run your Java code online

class Small{
    public static void main(String[] args) {
    int a=1;
    int b=2;
    int c=3;
    if(a<b){
        if(a<c){
            System.out.println("Smallest is "+a);
        }
        else{
            System.out.println("Smallest is "+c);
        }
    }
    else{
               if(b<c){
            System.out.println("Smallest is "+b);
        }
        else{
            System.out.println("Smallest is "+c);
        }
    }
    }
}