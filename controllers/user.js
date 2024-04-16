const User = require("../models/user.model");
// const Sales = require("../models/sales.model")
const nodemailer = require("nodemailer");
const { APP_SECRET } = require("../config");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const generateUniqueId = require("generate-unique-id");
const Sales = require('../models/sales.model');
const smtpTransport =require("nodemailer-smtp-transport")

module.exports.register = async (req, res) => {
  try {
    let { fullname, email, password } = req.body;
    const UniqueId = generateUniqueId({
      length: 10,
      useLetters: true,
    });

    let user = await User.findOne({ email });
    console.log(user);
    if (user) {
      return res.status(500).json({
        message: "User already exists",
        status: false,
      });
    } else {
      let hashPassword = bcrypt.hashSync(password, 10);

      let newUser = new User({
        fullname,
        email,
        password: hashPassword,
        refID: UniqueId,
      });

      await newUser.save();
      const token = jwt.sign(
        { id: newUser._id, email: newUser.email },
        APP_SECRET
      );
      return res.status(201).json({
        message: "Account created successfully",
        token,
        status: true,
      });
    }
  } catch (err) {
    console.log("err catch");
    console.log(err);
    return res.status(500).json({
      message: "An error occurred",
      status: false,
    });
  }
};

module.exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        message: "Incorrect email",
        status: false,
      });
    }
    const isPasswordValid = bcrypt.compareSync(password, user.password);
    if (isPasswordValid) {
      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
        APP_SECRET
      );
      return res.status(200).json({
        token,
        message: "Login successful",
        status: true,
        role: user.role,
      });
    } else {
      return res.status(400).json({
        message: "Password is incorrect",
        status: false,
      });
    }
  } catch (err) {
    return res.status(400).json({
      message: "An error occurred",
      status: false,
    });
  }
};

module.exports.recordReferralClick = async (req, res) => {
    try {
      const { referralId } = req.params; // Assuming referral ID is passed as a parameter in the URL
  
      // Find the user with the referral ID
      const referrer = await User.findOne({ refID: referralId });
  
      if (!referrer) {
        return res.status(404).json({
          message: "Referrer not found",
          status: false,
        });
      }
  
      // Create a new sales record
      const newSale = new Sales({
        referrer: referrer._id,
        date: new Date(),
      });
  
      // Save the sales record
      await newSale.save();
  
      // Send email notification to the referrer
      const transporter = nodemailer.createTransport(
        smtpTransport({
            host: "mail.jamesdroyce.com",
            port: 465,
            secureConnection: true,
            debug: true,
            logger: true,
            auth: {
            user: process.env.NODEMAILER_USERNAME,
            pass: process.env.NODEMAILER_PASSWORD,
            },
            connectionTimeout: 5 * 60 * 1000,
            tls: {
            rejectUnauthorized: false,
            },
        })
      );
  
      const mailOptions = {
        from: 'rrb@jamesdroyce.com',
        to: "director@sollohinc.com",
        subject: 'New Referral Click',
        text: `Hello ${referrer.fullname},\n\n Just got a new referral record`,
      };
  
      await transporter.sendMail(mailOptions);
  
      return res.status(200).json({
        message: "Referral click recorded and email sent successfully",
        status: true,
      });
    } catch (err) {
        console.log(err)
      return res.status(500).json({
        message: "An error occurred",
        status: false,
      });
    }
  };

// module.exports.getUplineDetails = (req, res) => {
//   let { refphone } = req.params;
//   User.findOne({ refID: refphone }, (err, upline) => {
//     if (err) {
//       return res.status(400).json({
//         message: "an unknow error occured",
//       });
//     }
//     if (upline) {
//       return res.status(200).json({
//         message: `${upline.fullname} invited you`,
//         status: true,
//       });
//     }
//     if (!upline) {
//       return res.status(200).json({
//         message: "realtor with this id does not exist",
//         status: false,
//       });
//     }
//   });
// };

// module.exports.profile=(req,res)=>{
//     User.findOne({_id:req.user.id})
//     .populate("upline")
//     .then((user)=>{
//         Sales.find({user:user._id})
//         .then((sales)=>{
//             let records =[]
//             sales.map((sle)=>{
//                 records.push(...sle.record)
//             })
//             let commissionPaidTrueCount = 0;
//             let commissionPaidFalseCount = 0;

//             for (let i = 0; i < records.length; i++) {
//                 if (records[i].commissionPaid === true) {
//                     commissionPaidTrueCount++;
//                 } else {
//                     commissionPaidFalseCount++;
//                 }
//             }
//             return res.status(200).json({
//                 user,
//                 records,
//                 paid:commissionPaidTrueCount,
//                 unpaid: commissionPaidFalseCount,
//             })
//         })
//     })
//     .catch((err)=>{
//         return res.status(400).json({
//             message:"an error occured"
//         })
//     })
// }

// module.exports.refferalData = (req, res) => {
//   //find my self so i can get my downline id
//   User.findOne({ _id: req.user.id }, (err, me) => {
//     // find my upline usinf my upline id
//     if (me) {
//       User.findOne({ _id: me.upline }, (err, myupline) => {
//         User.find({ upline: req.user.id })
//           .populate("upline")
//           .then((downlines) => {
//             let firstlv = downlines;
//             let secondlvArrray = [];
//             let count = 0;
//             if (downlines.length > 0) {
//               for (let i = 0; i < downlines.length; i++) {
//                 const downline = downlines[i];
//                 User.findOne({ upline: downline._id }, (err, secondlv) => {
//                   let checker = i + 1;
//                   console.log(checker, downlines.length, secondlv);
//                   if (secondlv != null) {
//                     secondlvArrray.push(secondlv);
//                   }
//                   if (checker == downlines.length) {
//                     let data = {
//                       upline: myupline,
//                       firstlv,
//                       secondlv: secondlvArrray,
//                     };
//                     return res.status(200).json({
//                       data,
//                     });
//                   } else {
//                     if (secondlv != null) {
//                       secondlvArrray.push(secondlv);
//                     } else {
//                     }
//                   }
//                 });
//               }
//               // downline.map((downrref)=>{
//               //     User.findOne({upline:downrref._id},(err,secondlv)=>{
//               //         console.log(secondlv,err)
//               //         count+=1
//               //         if(count==downline.length){
//               //         if(secondlv!=null){
//               //             secondlvArrray.push(secondlv)
//               //         }else{
//               //                 let data={
//               //                     upline:myupline,
//               //                     firstlv,
//               //                     secondlv:secondlvArrray
//               //                 }
//               //                 res.status(200).json({
//               //                     data
//               //                 })
//               //             }
//               //         }
//               //     })
//               // })
//             } else {
//               let data = {
//                 upline: myupline,
//                 firstlv,
//                 secondlv: secondlvArrray,
//               };
//               return res.status(200).json({
//                 data,
//               });
//             }
//           });
//       });
//     } else {
//       return res.status(400).json({
//         message: "This user not found",
//       });
//     }
//   });
// };

// module.exports.refferalDataById = (req, res) => {
//   //find my self so i can get my downline id
//   User.findOne({ _id: req.body.id }, (err, me) => {
//     // find my upline usinf my upline id
//     if (me) {
//       User.findOne({ _id: me.upline }, (err, myupline) => {
//         User.find({ upline: req.body.id })
//           .populate("upline")
//           .then((downlines) => {
//             let firstlv = downlines;
//             let secondlvArrray = [];
//             let count = 0;
//             console.log(downlines.length);
//             if (downlines.length > 0) {
//               for (let i = 0; i < downlines.length; i++) {
//                 const downline = downlines[i];
//                 User.findOne({ upline: downline._id }, (err, secondlv) => {
//                   let checker = i + 1;
//                   console.log(checker, downlines.length, secondlv);
//                   if (secondlv != null) {
//                     secondlvArrray.push(secondlv);
//                   }
//                   if (checker == downlines.length) {
//                     let data = {
//                       upline: myupline,
//                       firstlv,
//                       secondlv: secondlvArrray,
//                     };
//                     return res.status(200).json({
//                       data,
//                     });
//                   } else {
//                     if (secondlv != null) {
//                       secondlvArrray.push(secondlv);
//                     } else {
//                     }
//                   }
//                 });
//               }
//             } else {
//               let data = {
//                 upline: myupline,
//                 firstlv,
//                 secondlv: secondlvArrray,
//               };
//               return res.status(200).json({
//                 data,
//               });
//             }
//           });
//       });
//     } else {
//       return res.status(400).json({
//         message: "This user not found",
//       });
//     }
//   });
// };

// module.exports.updateBankDetails = (req, res) => {
//   let { bankName, bankAccount, bankHolder } = req.body;
//   let details = { bankName, bankAccount, bankHolder };
//   User.findOneAndUpdate(
//     { _id: req.user.id },
//     { bankDetails: details },
//     (err, user) => {
//       if (err) {
//         return res.status(400).json({
//           message: "an error occured",
//         });
//       }
//       if (!user) {
//         return res.status(400).json({
//           message: "user not found",
//         });
//       }
//       if (user) {
//         return res.status(200).json({
//           message: "Bank details saved successfuly",
//           status: true,
//         });
//       }
//     }
//   );
// };

// module.exports.updateSocialDetails = (req, res) => {
//   let { facebookURL, twitterURL, youtubeURL, instagramURL, whatsappURL } =
//     req.body;
//   let details = {
//     facebookURL,
//     twitterURL,
//     youtubeURL,
//     instagramURL,
//     whatsappURL,
//   };
//   User.findOneAndUpdate(
//     { _id: req.user.id },
//     { socialDetails: details },
//     (err, user) => {
//       if (err) {
//         return res.status(400).json({
//           message: "an error occured",
//         });
//       }
//       if (!user) {
//         return res.status(404).json({
//           message: "user not found",
//         });
//       }
//       if (user) {
//         return res.status(200).json({
//           message: " details saved successfuly",
//           status: true,
//         });
//       }
//     }
//   );
// };

// module.exports.updatePersonalDetails=(req,res)=>{
//     let {gender,stateOfOrigin,about,houseAdress,officeAdress,DOB,fullname,email,phone}  = req.body
//     let profile = req.file.path
//     const updatedSection = req.body;
//     // User.findOneAndUpdate({_id:req.user.id},{gender,stateOfOrigin,about,houseAdress,officeAdress,DOB,fullname,email,phone, profile},(err,user)=>{

//     User.findOneAndUpdate({_id:req.user.id},{...updatedSection,},(err,user)=>{
//         if(err){
//             return res.status(400).json({
//                 message:"an error occured"
//             })
//         }
//         if(!user){
//             return res.status(404).json({
//                 message:"user not found"
//             })
//         }
//         if(user){
//             return res.status(200).json({
//                 message:" details saved successfully",
//                 status:true
//             })
//         }
//     })
// }
// module.exports.updatePersonalDetails = (req, res) => {
//   const {
//     gender,
//     stateOfOrigin,
//     about,
//     houseAdress,
//     officeAdress,
//     DOB,
//     fullname,
//     email,
//     phone,
//   } = req.body;
//   const updatedSection = {
//     gender,
//     stateOfOrigin,
//     about,
//     houseAdress,
//     officeAdress,
//     DOB,
//     fullname,
//     email,
//     phone,
//   };
//   if (req.file) {
//     // If there is a new profile image in the request, update the 'profile' field in updatedSection
//     updatedSection.profile = req.file.path;
//   }

//   User.findOneAndUpdate(
//     { _id: req.user.id },
//     updatedSection,
//     { new: true },
//     (err, user) => {
//       if (err) {
//         return res.status(400).json({
//           message: "An error occurred",
//           error: err,
//         });
//       }
//       if (!user) {
//         return res.status(404).json({
//           message: "User not found",
//         });
//       }
//       return res.status(200).json({
//         message: "Details saved successfully",
//         status: true,
//       });
//     }
//   );
// };

// module.exports.getProfileById=(req,res)=>{
//     User.findOne({_id:req.params.id})
//     .populate("upline")
//     .then((user) => {
//         console.log(user)
//         Sales.find({user:user._id})
//         .populate("user")
//         .then((sales)=>{
//             User.findOne({_id:user.upline},(err,myupline)=>{
//                 User.find({upline:user._id})
//                 .populate("upline")
//                 .then((downlines)=>{
//                     let firstlv=downlines
//                     let secondlvArrray=[]
//                     console.log(firstlv, secondlvArrray)
//                     if(downlines.length > 0){
//                         for (let i = 0; i < downlines.length;i++ ) {
//                             const downline = downlines[i];
//                             User.findOne({upline:downline._id},(err,secondlv)=>{
//                                 let checker =i+1
//                                 // console.log(checker,downlines.length,secondlv)
//                                 console.log(secondlv)
//                                 if(secondlv!=null){
//                                     secondlvArrray.push(secondlv)
//                                 }
//                                 if(checker==downlines.length){
//                                     let data={
//                                         user,
//                                         sales,
//                                         upline:myupline,
//                                         firstlv,
//                                         secondlv:secondlvArrray
//                                     }
//                                     return res.status(200).json({
//                                         data
//                                     })
//                                 }else{
//                                     if(secondlv!=null){
//                                         secondlvArrray.push(secondlv)
//                                     }else{
//                                     }
//                                 }
//                             })

//                         }
//                     }else{
//                         let data = {
//                             user,
//                             upline:myupline,
//                             firstlv,
//                             secondlv:secondlvArrray
//                         }
//                         console.log(data)
//                         return res.status(200).json({
//                             data
//                         })
//                     }

//                 })
//         })
//             // User.find({upline:user._id})
//             // .then((upline)=>{
//             //     return res.status(200).json({
//             //         user,
//             //         sales,
//             //         upline
//             //     })
//             // })
//             // .catch(()=>{
//             //     return res.status(200).json({
//             //         user,
//             //         sales,
//             //         upline
//             //     })
//             // })
//         })
//     }).catch((err) => {
//         return res.status(400).json({
//             message:"an error occured"
//         })
//     });
// }

// module.exports.forgotPassword = async (req, res) => {
//   let accesscode;
//   function gene() {
//     accesscode = securePin.generatePinSync(4);
//     if (accesscode.charAt(0) === "0") {
//       gene();
//     } else {
//       return true;
//     }
//   }
//   gene();

//   let transporter = nodemailer.createTransport(
//     smtpTransport({
//       host: "mail.devemmy.com",
//       port: 465,
//       secureConnection: true,
//       debug: true,
//       logger: true,
//       auth: {
//         user: process.env.NODEMAILER_USERNAME,
//         pass: process.env.NODEMAILER_PASSWORD,
//       },
//       connectionTimeout: 5 * 60 * 1000,
//       tls: {
//         rejectUnauthorized: false,
//       },
//     })
//   );

//   let info = await transporter
//     .sendMail({
//       from: '" Realtor Portal" <bricks-image-temporaryemail@bricks-image.devemmy.com>', // sender address
//       to: req.body.email, // list of receivers
//       subject: "Realtors Portal ✔", // Subject line
//       text: "Realtors Portal -  reset password", // plain text body
//       html: `<h1>Your verification code </h1>:<h2>${accesscode}</h2><br/>`, // html body
//     })
//     .then((response) => {
//       User.findOne({ email: req.body.email }, (err, user) => {
//         if (err) res.status(404).json(err);
//         if (user) {
//           user.accesscode = accesscode;
//           user.save().then(() => {
//             return res.status(200).json({ message: "Sent" });
//           });
//         }
//       });
//     })
//     .catch((error) => {
//       return res.json({
//         message: "error occured!",
//         message1: error,
//       });
//     });
// };

// module.exports.verify = (req, res) => {
//   const { code, newPassword } = req.body;
//   User.findOne({ accesscode: code }, (err, user) => {
//     if (err) {
//       return res.status(400).json({
//         message: "an error occured",
//       });
//     }
//     if (user) {
//       if (user.accesscode == code) {
//         const salt = bcrypt.genSaltSync(10);
//         let hashPassword = bcrypt.hashSync(newPassword, salt);
//         user.password = hashPassword;
//         user.accesscode = "";
//         user.save().then(() => {
//           return res.status(200).json({
//             message: "password reset successfully",
//           });
//         });
//       } else {
//         return res.status(200).json({
//           message: "incorrect verification code",
//         });
//       }
//     }
//   });
// };

// module.exports.uploadProfilePicture = (req, res) => {
//   User.findOne({ _id: req.user.id }, (err, user) => {
//     if (err) {
//       return res.status(400).json({
//         message: "an error occured",
//       });
//     }
//     if (user) {
//       user.profile = req.file.path;
//       user
//         .save()
//         .then(() => {
//           return res.status(200).json({
//             profile: req.file.path,
//             message: "profile uploaded successfully",
//           });
//         })
//         .catch(() => {
//           return res.status(400).json({
//             message: "profile uploaded successfully",
//           });
//         });
//     }
//   });
// };
