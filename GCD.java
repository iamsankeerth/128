class GCD{
    public static void main(String[] args) {
      int a=10,num1=10;
      int b=20,num2=20;
      while(b!=0){
          int temp =b;
          b=a%b;
          a=temp;
      }
      System.out.println("GCD of two numbers "+num1+" and "+num2 +" is "+a);
    }
}