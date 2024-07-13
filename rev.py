original=1234
rev=0
temp=original
while(temp!=0):
    rem=temp%10
    rev=rev*10 + rem
    temp//=10
print("Reverse of ",original," is ", rev)