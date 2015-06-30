##Introduction:

This is a `ionic-datepicker` bower component which can be used with any Ionic framework's application.

[View Demo](http://rajeshwarpatlolla.github.io/DatePickerForIonicFramework/demo/ "Demo") 


##Prerequisites.

1) node.js, bower and gulp.

##How to use:

1) In your project repository install the ionic date picker using bower

    bower install ionic-datepicker --save
    
2) Then you can see the following directory structure see in your project folder

![Directory structure](https://lh3.googleusercontent.com/8x3OByTXzzgJSxm-n5Yg8-0g-u2OZt18j9EbvNTgK3Q=w112-h207-p-no "Directory structure")

Give the path of  `style.css, templates.js and ionic-datepicker.js` in your `index.html` file.

````html
<link href="lib/ionic-datepicker/dist/style.css" rel="stylesheet"> 
<!-- path to ionic/angularjs js -->
<script src="lib/ionic-datepicker/dist/templates.js"></script>
<script src="lib/ionic-datepicker/dist/ionic-datepicker.js"></script>
````    
    
3) In your application module inject the dependency `ionic-datepicker`, in order to work with the ionic time picker
````javascript
angular.module('mainModuleName', ['ionic', 'ionic-datepicker']){
 //
}
````

4) Use the below format in your template's corresponding controller

````javascript
$scope.currentDate = new Date();
````

5) Then use the below format in your template / html file

````html
<ionic-datepicker idate="currentDate" >
    <button class="button button-block button-positive"> {{ currentDate | date:'dd - MMMM - yyyy' }} </button>
</ionic-datepicker>
````


a) `ionic-datepicker` is the directive, to which we can pass required vales.

b) `idate` takes date object. If we don't pass any value, the default value will be `new Date()`.

Tested with `angular#1.3.6` and `ionic#1.0.0-rc.4`. 

##Screen Shots:

Once you are successfully done with the above steps, you should be able to see the below screen shots.
I have used two buttons here. 

The first screen shot shows only the buttons before clicking on them.
Once you click on the button you should see the second screen shot.
 
![Date picker buttons](https://lh3.googleusercontent.com/YYlyw-ozro_rq9QB7hB1OzGKxo4kJpeGpXFo0ZgxF24=w117-h207-p-no "Date picker buttons") 
![Date picker modal](https://lh3.googleusercontent.com/GZPl7o0dx_Vp7lQB2IX35eM0u3wkK3bvSQw7mH3I5uY=w116-h207-p-no "Date picker modal")
##Versions:

### 1) v0.1.0
The whole date picker functionality has been implemented, and can be installed with  `bower install ionic-datepicker --save`
### 2) v0.1.1
Bug Fix. This is the latest version of `ionic-datepicker` component.
### 3) v0.1.2
Bug Fix. If we don't pass the date to the time picker it will pick the todays date by default.
### 4) v0.1.3
[Bug Fix](http://forum.ionicframework.com/t/ionic-datepicker-bower-component-for-ionic-framework-applications/21516/14)

##License:
MIT

##Contact:
gmail : rajeshwar.patlolla@gmail.com

github : https://github.com/rajeshwarpatlolla

twitter : https://twitter.com/rajeshwar_9032

facebook : https://www.facebook.com/rajeshwarpatlolla

paypal : rajeshwar.patlolla@gmail.com
