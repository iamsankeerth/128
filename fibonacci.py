num1=0
num2=1
limit=10
num3=0
print("fibonacci series is ")
if(limit==1):
    print(num1)
elif(limit==2):
    print(num2)
else:
    print(num1)
    print(num2)
    for i in range(limit-1):
        num3=num1+num2
        print(num3)
        num1=num2
        num2=num3

