var Service = require('node-windows').Service;

// Create a new service object
var svc = new Service({
  name:'Home Automation Control Center',
  description: 'Home automation control centor nodejs web service',
  script: 'C:\\Users\\jialong\\Documents\\GitHub\\control_center\\index.js'
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on('install',function(){
  svc.start();
});

svc.install();