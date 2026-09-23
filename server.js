const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3001;

const PROJECTS_FILE = path.join(__dirname, 'data', 'projects.json');

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(function(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

function readJSON(file) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) { return []; }
}

function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) {}
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// List projects
app.get('/api/projects', function(req, res) {
  res.json(readJSON(PROJECTS_FILE));
});

// Get project
app.get('/api/projects/:id', function(req, res) {
  var projects = readJSON(PROJECTS_FILE);
  var project = projects.find(function(p) { return p._id === req.params.id; });
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// Create project
app.post('/api/projects', function(req, res) {
  var projects = readJSON(PROJECTS_FILE);
  var name = (req.body.name || 'Untitled Project').trim().slice(0, 100);
  var project = {
    _id: 'proj_' + uuidv4().slice(0, 8),
    name: name,
    sections: req.body.sections || [],
    theme: req.body.theme || { primary: '#6366f1', secondary: '#8b5cf6', bg: '#ffffff', text: '#1e293b', font: 'Inter' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(project);
  writeJSON(PROJECTS_FILE, projects);
  res.json(project);
});

// Update project
app.put('/api/projects/:id', function(req, res) {
  var projects = readJSON(PROJECTS_FILE);
  var idx = projects.findIndex(function(p) { return p._id === req.params.id; });
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  projects[idx].name = (req.body.name || projects[idx].name).trim().slice(0, 100);
  if (req.body.sections) projects[idx].sections = req.body.sections;
  if (req.body.theme) projects[idx].theme = req.body.theme;
  projects[idx].updatedAt = new Date().toISOString();
  writeJSON(PROJECTS_FILE, projects);
  res.json(projects[idx]);
});

// Delete project
app.delete('/api/projects/:id', function(req, res) {
  var projects = readJSON(PROJECTS_FILE).filter(function(p) { return p._id !== req.params.id; });
  writeJSON(PROJECTS_FILE, projects);
  res.json({ ok: true });
});

// Export HTML
app.post('/api/export', function(req, res) {
  var sections = req.body.sections;
  var theme = req.body.theme || {};
  if (!sections || !sections.length) return res.status(400).json({ error: 'No sections' });

  var primary = theme.primary || '#6366f1';
  var secondary = theme.secondary || '#8b5cf6';
  var bgColor = theme.bg || '#ffffff';
  var textColor = theme.text || '#1e293b';
  var font = theme.font || 'Inter';

  var sectionsHTML = '';
  for (var i = 0; i < sections.length; i++) {
    sectionsHTML += buildSection(sections[i], primary, secondary, bgColor, textColor);
  }

  var html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
  html += '<link rel="preconnect" href="https://fonts.googleapis.com">\n';
  html += '<link href="https://fonts.googleapis.com/css2?family=' + font.replace(/ /g, '+') + ':wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n';
  html += '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">\n';
  html += '<style>\n';
  html += '*{margin:0;padding:0;box-sizing:border-box}\n';
  html += 'body{font-family:\'' + font + '\',sans-serif;color:' + textColor + ';background:' + bgColor + ';overflow-x:hidden}\n';
  html += 'a{text-decoration:none;color:inherit}\nimg{max-width:100%}\n';
  html += 'input:focus,textarea:focus{outline:2px solid ' + primary + ';outline-offset:2px}\n';
  // Animations
  html += '@keyframes fadeInUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}\n';
  html += '@keyframes fadeInLeft{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}\n';
  html += '@keyframes fadeInRight{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}\n';
  html += '@keyframes scaleIn{from{opacity:0;transform:scale(0.8)}to{opacity:1;transform:scale(1)}}\n';
  html += '@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}\n';
  html += '@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}\n';
  html += '@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}\n';
  html += '@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}\n';
  html += '.anim-fade-up{opacity:0;transform:translateY(40px);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)}\n';
  html += '.anim-fade-up.visible{opacity:1;transform:translateY(0)}\n';
  html += '.anim-fade-left{opacity:0;transform:translateX(-40px);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)}\n';
  html += '.anim-fade-left.visible{opacity:1;transform:translateX(0)}\n';
  html += '.anim-fade-right{opacity:0;transform:translateX(40px);transition:all 0.8s cubic-bezier(0.16,1,0.3,1)}\n';
  html += '.anim-fade-right.visible{opacity:1;transform:translateX(0)}\n';
  html += '.anim-scale{opacity:0;transform:scale(0.8);transition:all 0.6s cubic-bezier(0.16,1,0.3,1)}\n';
  html += '.anim-scale.visible{opacity:1;transform:scale(1)}\n';
  html += '.delay-1{transition-delay:0.1s}.delay-2{transition-delay:0.2s}.delay-3{transition-delay:0.3s}.delay-4{transition-delay:0.4s}.delay-5{transition-delay:0.5s}\n';
  // Button hover
  html += '.btn-hover{transition:all 0.3s cubic-bezier(0.16,1,0.3,1);position:relative;overflow:hidden}\n';
  html += '.btn-hover:hover{transform:translateY(-3px);box-shadow:0 10px 40px rgba(0,0,0,0.2)}\n';
  html += '.btn-hover:active{transform:translateY(-1px)}\n';
  // Card hover
  html += '.card-hover{transition:all 0.4s cubic-bezier(0.16,1,0.3,1)}\n';
  html += '.card-hover:hover{transform:translateY(-8px);box-shadow:0 20px 60px rgba(0,0,0,0.1)}\n';
  // Gradient bg animation
  html += '.gradient-anim{background-size:200% 200%;animation:gradientShift 4s ease infinite}\n';
  // Float animation
  html += '.float-anim{animation:float 3s ease-in-out infinite}\n';
  html += '.float-anim-delay{animation:float 3s ease-in-out 0.5s infinite}\n';
  // Icon bounce on hover
  html += '.icon-bounce{transition:all 0.3s ease}\n';
  html += '.icon-bounce:hover{transform:scale(1.2) rotate(5deg)}\n';
  // Underline animation
  html += '.underline-anim{position:relative;display:inline-block}\n';
  html += '.underline-anim::after{content:"";position:absolute;bottom:-2px;left:0;width:0;height:3px;background:inherit;border-radius:2px;transition:width 0.3s ease}\n';
  html += '.underline-anim:hover::after{width:100%}\n';
  // Shimmer effect
  html += '.shimmer{background:linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent);background-size:200% 100%;animation:shimmer 2s infinite}\n';
  // Smooth scroll
  html += 'html{scroll-behavior:smooth}\n';
  html += '</style>\n</head>\n<body>\n';
  // Intersection Observer for scroll animations
  html += '<script>\n';
  html += 'document.addEventListener("DOMContentLoaded",function(){\n';
  html += 'var observer=new IntersectionObserver(function(entries){\n';
  html += 'entries.forEach(function(entry){\n';
  html += 'if(entry.isIntersecting){\n';
  html += 'entry.target.classList.add("visible");\n';
  html += 'observer.unobserve(entry.target);\n';
  html += '}});\n';
  html += '},{threshold:0.15,rootMargin:"0px 0px -50px 0px"});\n';
  html += 'document.querySelectorAll(".anim-fade-up,.anim-fade-left,.anim-fade-right,.anim-scale").forEach(function(el){observer.observe(el)});\n';
  html += '});\n';
  html += '</script>\n';
  html += sectionsHTML;
  html += '\n</body>\n</html>';

  res.json({ html: html });
});

function buildSection(section, primary, secondary, bgColor, textColor) {
  var d = section.data || {};
  var t = section.type;

  if (t === 'hero') {
    return '<section style="background:linear-gradient(135deg,' + primary + ',' + secondary + ');color:#fff;padding:100px 40px;text-align:center;position:relative;overflow:hidden" class="gradient-anim">\n' +
      '<div style="position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.05) 0%,transparent 60%);animation:float 6s ease-in-out infinite"></div>\n' +
      '<h1 class="anim-fade-up" style="font-size:56px;font-weight:800;margin-bottom:20px;max-width:800px;margin-left:auto;margin-right:auto;line-height:1.1">' + esc(d.title || 'Welcome') + '</h1>\n' +
      '<p class="anim-fade-up delay-1" style="font-size:20px;opacity:0.9;margin-bottom:40px;max-width:600px;margin-left:auto;margin-right:auto;line-height:1.6">' + esc(d.subtitle || 'Your subtitle here') + '</p>\n' +
      '<a href="' + esc(d.ctaLink || '#') + '" class="btn-hover anim-scale delay-2" style="display:inline-block;background:#fff;color:' + primary + ';padding:16px 40px;border-radius:12px;font-weight:700;font-size:18px;box-shadow:0 4px 20px rgba(0,0,0,0.15)">' + esc(d.ctaText || 'Get Started') + '</a>\n</section>\n';
  }

  if (t === 'features') {
    var items = d.items || [];
    if (items.length === 0) items = [
      {icon: '⚡', title: 'Fast', desc: 'Lightning fast performance'},
      {icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security'},
      {icon: '📱', title: 'Responsive', desc: 'Works on all devices'}
    ];
    var cards = '';
    for (var i = 0; i < items.length; i++) {
      var delay = 'delay-' + (i + 1);
      cards += '<div class="card-hover anim-fade-up ' + delay + '" style="text-align:center;padding:32px;border-radius:16px;background:' + bgColor + ';border:1px solid rgba(0,0,0,0.05)">' +
        '<div class="icon-bounce float-anim" style="font-size:48px;margin-bottom:20px;display:inline-block">' + esc(items[i].icon) + '</div>' +
        '<h3 style="font-size:22px;font-weight:700;margin-bottom:10px">' + esc(items[i].title) + '</h3>' +
        '<p style="color:#64748b;font-size:15px;line-height:1.6">' + esc(items[i].desc) + '</p></div>\n';
    }
    return '<section style="padding:100px 40px;background:' + bgColor + '">\n' +
      '<h2 class="anim-fade-up" style="text-align:center;font-size:40px;font-weight:800;margin-bottom:16px">' + esc(d.title || 'Features') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="text-align:center;color:#64748b;font-size:16px;margin-bottom:56px;max-width:500px;margin-left:auto;margin-right:auto">Everything you need to succeed</p>\n' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:32px;max-width:1000px;margin:0 auto">' + cards + '</div>\n</section>\n';
  }

  if (t === 'pricing') {
    var plans = d.plans || [];
    if (plans.length === 0) plans = [
      {name: 'Basic', price: '$29', features: ['Feature 1', 'Feature 2', 'Feature 3']},
      {name: 'Pro', price: '$59', features: ['All Basic', 'Feature 4', 'Feature 5'], featured: true},
      {name: 'Enterprise', price: '$99', features: ['All Pro', 'Feature 6', 'Feature 7']}
    ];
    var cards = '';
    for (var i = 0; i < plans.length; i++) {
      var p = plans[i];
      var border = p.featured ? primary : '#e2e8f0';
      var shadow = p.featured ? 'transform:scale(1.08);box-shadow:0 20px 60px rgba(0,0,0,0.15)' : '';
      var btnBg = p.featured ? primary : '#f1f5f9';
      var btnColor = p.featured ? '#fff' : textColor;
      var badge = p.featured ? '<div style="background:linear-gradient(135deg,' + primary + ',' + secondary + ');color:#fff;display:inline-block;padding:6px 20px;border-radius:12px;font-size:12px;font-weight:700;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Most Popular</div>' : '';
      var feats = '';
      for (var j = 0; j < (p.features || []).length; j++) {
        feats += '<li style="padding:8px 0;font-size:14px;color:#475569;display:flex;align-items:center;gap:8px"><span style="color:' + primary + ';font-weight:700">✓</span> ' + esc(p.features[j]) + '</li>';
      }
      var delay = 'delay-' + (i + 1);
      cards += '<div class="card-hover anim-scale ' + delay + '" style="flex:1;max-width:320px;background:#fff;border-radius:20px;padding:36px;text-align:center;border:2px solid ' + border + ';' + shadow + ';position:relative">' +
        badge +
        '<h3 style="font-size:22px;font-weight:700;margin-bottom:12px">' + esc(p.name) + '</h3>' +
        '<div style="font-size:48px;font-weight:800;background:linear-gradient(135deg,' + primary + ',' + secondary + ');-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px">' + esc(p.price) + '</div>' +
        '<ul style="list-style:none;text-align:left;margin-bottom:28px">' + feats + '</ul>' +
        '<a href="#" class="btn-hover" style="display:block;background:' + btnBg + ';color:' + btnColor + ';padding:14px;border-radius:12px;font-weight:700;font-size:15px">Choose Plan</a></div>\n';
    }
    return '<section style="padding:100px 40px;background:#f8fafc">\n' +
      '<h2 class="anim-fade-up" style="text-align:center;font-size:40px;font-weight:800;margin-bottom:16px">' + esc(d.title || 'Pricing') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="text-align:center;color:#64748b;font-size:16px;margin-bottom:56px">Choose the plan that works for you</p>\n' +
      '<div style="display:flex;gap:28px;max-width:1100px;margin:0 auto;justify-content:center;align-items:center">' + cards + '</div>\n</section>\n';
  }

  if (t === 'testimonials') {
    var items = d.items || [];
    if (items.length === 0) items = [
      {name: 'John D.', role: 'CEO', text: 'Amazing product! Changed my business.'},
      {name: 'Sarah M.', role: 'Designer', text: 'Best tool I have ever used.'},
      {name: 'Mike R.', role: 'Developer', text: 'Highly recommended for everyone.'}
    ];
    var cards = '';
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var delay = 'delay-' + (i + 1);
      cards += '<div class="card-hover anim-fade-up ' + delay + '" style="background:#f8fafc;border-radius:16px;padding:28px;border:1px solid rgba(0,0,0,0.04)">' +
        '<div style="font-size:32px;margin-bottom:12px;color:' + primary + '">&#10077;</div>' +
        '<p style="font-size:15px;color:#475569;margin-bottom:20px;line-height:1.7;font-style:italic">' + esc(item.text) + '</p>' +
        '<div style="display:flex;align-items:center;gap:14px">' +
        '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,' + primary + ',' + secondary + ');display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:18px;box-shadow:0 4px 12px rgba(99,102,241,0.3)">' + esc((item.name || 'U').charAt(0)) + '</div>' +
        '<div><div style="font-weight:700;font-size:15px">' + esc(item.name) + '</div><div style="font-size:13px;color:#94a3b8">' + esc(item.role) + '</div></div></div></div>\n';
    }
    return '<section style="padding:100px 40px;background:' + bgColor + '">\n' +
      '<h2 class="anim-fade-up" style="text-align:center;font-size:40px;font-weight:800;margin-bottom:16px">' + esc(d.title || 'What People Say') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="text-align:center;color:#64748b;font-size:16px;margin-bottom:56px">Loved by thousands of customers</p>\n' +
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:28px;max-width:1000px;margin:0 auto">' + cards + '</div>\n</section>\n';
  }

  if (t === 'faq') {
    var items = d.items || [];
    if (items.length === 0) items = [
      {q: 'What is this?', a: 'An amazing product that helps you.'},
      {q: 'How much does it cost?', a: 'Starting at just $29/month.'},
      {q: 'Can I cancel anytime?', a: 'Yes, no contracts required.'}
    ];
    var rows = '';
    for (var i = 0; i < items.length; i++) {
      var delay = 'delay-' + (i + 1);
      rows += '<div class="anim-fade-up ' + delay + '" style="border-bottom:1px solid #e2e8f0;padding:24px 0;transition:all 0.3s ease" onmouseover="this.style.paddingLeft=\'12px\';this.style.borderColor=\'' + primary + '\'" onmouseout="this.style.paddingLeft=\'0\';this.style.borderColor=\'#e2e8f0\'">' +
        '<h4 style="font-size:17px;font-weight:600;margin-bottom:8px;color:' + textColor + '">' + esc(items[i].q) + '</h4>' +
        '<p style="font-size:14px;color:#64748b;line-height:1.7">' + esc(items[i].a) + '</p></div>\n';
    }
    return '<section style="padding:100px 40px;background:' + bgColor + '">\n' +
      '<h2 class="anim-fade-up" style="text-align:center;font-size:40px;font-weight:800;margin-bottom:16px">' + esc(d.title || 'FAQ') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="text-align:center;color:#64748b;font-size:16px;margin-bottom:56px">Got questions? We got answers.</p>\n' +
      '<div style="max-width:700px;margin:0 auto">' + rows + '</div>\n</section>\n';
  }

  if (t === 'cta') {
    return '<section style="padding:100px 40px;background:linear-gradient(135deg,' + primary + ',' + secondary + ');color:#fff;text-align:center;position:relative;overflow:hidden" class="gradient-anim">\n' +
      '<div style="position:absolute;top:-50%;right:-50%;width:100%;height:200%;background:radial-gradient(circle,rgba(255,255,255,0.08) 0%,transparent 60%);animation:float 5s ease-in-out infinite"></div>\n' +
      '<h2 class="anim-fade-up" style="font-size:42px;font-weight:800;margin-bottom:16px;position:relative">' + esc(d.title || 'Ready to Get Started?') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="font-size:20px;opacity:0.9;margin-bottom:40px;max-width:500px;margin-left:auto;margin-right:auto;line-height:1.6;position:relative">' + esc(d.subtitle || 'Join thousands of satisfied customers') + '</p>\n' +
      '<a href="' + esc(d.ctaLink || '#') + '" class="btn-hover anim-scale delay-2" style="display:inline-block;background:#fff;color:' + primary + ';padding:16px 40px;border-radius:12px;font-weight:700;font-size:18px;box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative">' + esc(d.ctaText || 'Get Started Now') + '</a>\n</section>\n';
  }

  if (t === 'contact') {
    return '<section style="padding:100px 40px;background:#f8fafc">\n' +
      '<h2 class="anim-fade-up" style="text-align:center;font-size:40px;font-weight:800;margin-bottom:16px">' + esc(d.title || 'Contact Us') + '</h2>\n' +
      '<p class="anim-fade-up delay-1" style="text-align:center;color:#64748b;font-size:16px;margin-bottom:48px">We would love to hear from you</p>\n' +
      '<div class="anim-fade-up delay-2" style="max-width:500px;margin:0 auto">' +
      '<input type="text" placeholder="Your Name" style="width:100%;padding:14px 18px;border:2px solid #e2e8f0;border-radius:12px;margin-bottom:14px;font-size:15px;font-family:inherit;transition:border-color 0.3s" onfocus="this.style.borderColor=\'' + primary + '\'" onblur="this.style.borderColor=\'#e2e8f0\'">\n' +
      '<input type="email" placeholder="Your Email" style="width:100%;padding:14px 18px;border:2px solid #e2e8f0;border-radius:12px;margin-bottom:14px;font-size:15px;font-family:inherit;transition:border-color 0.3s" onfocus="this.style.borderColor=\'' + primary + '\'" onblur="this.style.borderColor=\'#e2e8f0\'">\n' +
      '<textarea placeholder="Your Message" rows="4" style="width:100%;padding:14px 18px;border:2px solid #e2e8f0;border-radius:12px;margin-bottom:20px;font-size:15px;font-family:inherit;resize:vertical;transition:border-color 0.3s" onfocus="this.style.borderColor=\'' + primary + '\'" onblur="this.style.borderColor=\'#e2e8f0\'"></textarea>\n' +
      '<button class="btn-hover" style="background:linear-gradient(135deg,' + primary + ',' + secondary + ');color:#fff;border:none;padding:16px 32px;border-radius:12px;font-weight:700;font-size:16px;cursor:pointer;width:100%;box-shadow:0 4px 20px rgba(99,102,241,0.3)">Send Message</button></div>\n</section>\n';
  }

  if (t === 'footer') {
    return '<footer style="padding:40px;background:' + textColor + ';color:#94a3b8;text-align:center;font-size:14px">\n' +
      '<p>' + esc(d.text || '© 2026 Your Company. All rights reserved.') + '</p>\n</footer>\n';
  }

  if (t === 'spacer') {
    return '<div style="height:' + (d.height || 60) + 'px"></div>\n';
  }

  return '';
}

module.exports = app;

if (require.main === module) {
  app.listen(PORT, function() {
    console.log('\n  PageCraft Landing Page Builder v1.0');
    console.log('  Server: http://localhost:' + PORT);
    console.log('  Builder: http://localhost:' + PORT + '\n');
  });
}
