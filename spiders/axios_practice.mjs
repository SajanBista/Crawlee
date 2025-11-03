/*console.log("==========GET REQUEST========");

import axios from 'axios';

// const axios = require('axios');
axios.get('https://jsonplaceholder.typicode.com/posts/1')
.then(response=>{
    console.log("Data received");
    console.log(response.data);

})
.catch(error=>{
    console.log(error);
}

);

await console.log("==========POST REQUEST========");
// POST  is used to send data to the server

axios.post("https://jsonplaceholder.typicode.com/posts/1", {
    title: 'My introduction',
    body:"I am Sajan from dhankuta and HI developers",
    userId:1

})
.then(response =>{
    console.log("Post created");
    console.log("response.data")
})
.catch(error => {
    console.log("Error:", error)
});



axios.put('https://jsonplaceholder.typicode.com/posts/1', {
  title: 'Updated Post',
  body: 'This post is updated!',
  userId: 1
})
.then(response => {
  console.log("Post updated:");
  console.log(response.data);
})
.catch(error => {
  console.log("Error:", error);
});


axios.delete('https://jsonplaceholder.typicode.com/posts/1')
  .then(response => {
    console.log("Post deleted:", response.data);
  })
  .catch(error => {
    console.log("Error:", error);
  });


*/

import axios from 'axios';

console.log("async/await");

async function fetchpost(){
    try{
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts/1');
        console.log("Async/Await: ", response.data);
    
    }
    catch (error){
        console.log("Error: ", error);
    }
}

fetchpost();