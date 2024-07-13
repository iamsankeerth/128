// Online Java Compiler
// Use this editor to write, compile and run your Java code online

class Large{
    public static void main(String[] args) {
    int a=1;
    int b=2;
    int c=3;
    if(a>b){
        if(a>c){
            System.out.println("largest is "+a);
        }
        else{
            System.out.println("largest is "+c);
        }
    }
    else{
               if(b>c){
            System.out.println("largest is "+b);
        }
        else{
            System.out.println("largest is "+c);
        }
    }
    }
}