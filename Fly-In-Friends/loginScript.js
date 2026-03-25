//creates account from 
function createAccount(){
    //fetch data from login page, encrypt with bcrypt?
    //parse data in proper Json syntax
    //update Database Records
}

//verifies that account is correct
function verifyAccountDetails(){
    //take user info

    //get in account details from Mongo database

    //compare

    //returns true if account details are valid
}

//fetches account details
function fetchAccountDetails(){

}

//the functions to be loaded into server.js
module.exports = {fetchAccountDetails, createAccount,verifyAccountDetails };