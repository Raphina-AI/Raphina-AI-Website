require('dotenv').config()
const express = require('express') 
const ejs = require('ejs')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
const session = require('express-session')
const adminschema = require('./schema/adminschema')
const waitlistschema = require('./schema/waitlistschema')
const fs = require('fs')

const adminkey = process.env.ADMINKEY

const mongodb = process.env.MONGODB
mongoose.connect(mongodb)
.then(() => {
   console.log('Connection successful')
}).catch((err) => {
    console.log(err, "Connection failed")
})

const app = express()
app.use('/assets', express.static('assets')) 
app.set('view engine', 'ejs')
app.use(express.urlencoded({extended: true}))
app.use(cookieParser())
app.use(express.json())
app.use(
    session({
      resave: false,
      saveUninitialized: true,
      secret: 'secret',
    })
);

app.use(require('connect-flash')());
app.use(function (req, res, next) {
  res.locals.messages = require('express-messages')(req, res);
  next();
});

app.get('/', function(req,res){ 
    res.render('index')
})
app.get('/about', function(req,res){ 
    res.render('about')
})
app.get('/blog', function(req,res){ 
    res.render('blog')
})

app.post('/waitlist', (req,res)=>{
    const details = req.body

    run()
    async function run(){
        try {
            const waitlist = new waitlistschema({
                name: details.name,
                email: details.email,
                city: details.city,
                gender: details.gender
            })
            await waitlist.save()
        }
        catch (err) {
            console.log(err.message)
        
        }
    }
})

app.get('/adminregister', (req,res)=>{
    res.render('adminregister')
})

app.post('/adminregister', async(req,res)=>{
    const regInfo = req.body
    const password = regInfo.password
  
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)
  
      run()
      async function run(){
          try {
              const admin = new adminschema({
                  email: regInfo.email,
                  password: hashedPassword
              })
              await admin.save()
              res.redirect('/admin')
          }
          catch (err) {
            console.log(err.message)
            req.flash('danger','An Error Occured,Please try again')
            res.redirect('/adminregister')
          
          }
      }
})

app.get('/admin',protectAdminRoute, async (req,res)=>{
    try{
      const waitlists = await waitlistschema.find()
        res.render('admin', {waitlists: waitlists})
    } catch(err){
        console.log(err)
    }
})
    
function protectAdminRoute(req, res, next){
  const token = req.cookies.admintoken
  try{
      const user = jwt.verify(token, adminkey)

      req.user = user
      // console.log(req.user)
      next()
  }
  catch(err){
      res.clearCookie('admintoken')
      return res.render('adminlogin')
  }
}

app.post('/adminlogin', async (req,res)=>{
  const loginInfo = req.body

  const email = loginInfo.email
  const password = loginInfo.password

  const admin = await adminschema.findOne({email})
  try{
    if (!admin){
        req.flash('danger','User Not Found')
        res.redirect('/admin')
    } else{
        bcrypt.compare(password, admin.password, async (err,data)=>{
            if(data){
                const payload1 = {
                    user:{
                        email: admin.email
                    }
                }
                const token1 = jwt.sign(payload1, adminkey,{
                    expiresIn: '3600s'
                })

                res.cookie('admintoken', token1, {
                    httpOnly: false
                })

                res.redirect('/admin')
            } else{
                req.flash('danger', 'Incorrect Password, Please try again')
                res.redirect('/admin')
                }
            })
        }
  } catch(err){
    console.log(err)
  }

})

app.get('/exportwaitlist', async (req,res)=>{
    const waitlist = await waitlistschema.find()
    const waitliststring = JSON.stringify(waitlist)
    // console.log(waitliststring)
    fs.writeFileSync('waitlist.json', waitlist, (err)=>{
        if (err){console.log(err)}
    })
    const waitlistfile = __dirname+'/waitlist.json'
    // fs.readFile(waitlistfile, 'utf8', (err,data)=>{
    //     console.log(data)
    // })
    res.download(waitlistfile)
})

const port = process.env.PORT || 3000

app.listen(port, ()=>{
    console.log(`App started on port ${port}`)
} )