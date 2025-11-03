class Person{
    constructor(name,age){
        this.name = name;
        this.age = age;
        

    }

    greet(){
        return `Hello, my name is ${this.name}`;
    }
}

    const person1 = new Person("sajan", 22);
    const person2 = new Person("Rita", 24);

    console.log(person1.greet());
    console.log(person2.greet());

