function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf('http://sandbox.lavbic.net/teaching/OIS/gradivo/') > -1;
  if (jeSmesko) {
    sporocilo = sporocilo.replace(/\</g, '&lt;').replace(/\>/g, '&gt;').replace('&lt;img', '<img').replace('png\' /&gt;', 'png\' />');
    return $('<div style="font-weight: bold"></div>').html(sporocilo);
  } else {
    return $('<div style="font-weight: bold;"></div>').text(sporocilo);
  }
}

function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}

function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  sporocilo = dodajSmeske(sporocilo);
  var kopijaSporocila = sporocilo;
  var sistemskoSporocilo;

  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  } else {
    sporocilo = filtirirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  }
  
  $('#poslji-sporocilo').val('');
  
  var indeks = 0;
  var podatki = undefined;
  while((podatki = slika(kopijaSporocila, indeks)) != undefined){
    indeks = podatki[1];
    $('#sporocila').append($('<div></div>').html('<img src="' + podatki[0] + '" style="padding-left:20px; width:200px"/>'));
  }
  indeks = 0;
  while((podatki = video(kopijaSporocila, indeks)) != undefined){
    indeks = podatki[1];
    console.log(podatki[0]);
    $('#sporocila').append($('<div></div>').html('<iframe src="https://www.youtube.com/embed/' + podatki[0] + '" allowfullscreen style="width:200px; height:150px; margin-left:20px"></iframe>'));
  }
  $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));

}

var socket = io.connect();
var trenutniVzdevek = "", trenutniKanal = "";

var vulgarneBesede = [];
$.get('/swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});

function filtirirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    vhod = vhod.replace(new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi'), function() {
      var zamenjava = "";
      for (var j=0; j < vulgarneBesede[i].length; j++)
        zamenjava = zamenjava + "*";
      return zamenjava;
    });
  }
  return vhod;
}

$(document).ready(function() {
  var klepetApp = new Klepet(socket);

  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });

  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });

  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
    
    var indeks = 0;
    var podatki = undefined;
    while((podatki = slika(sporocilo.besedilo, indeks)) != undefined){
      indeks = podatki[1];
      $('#sporocila').append($('<div></div>').html('<img src="' + podatki[0] + '" style="padding-left:20px; width:200px"/>'));
    }
    indeks = 0;
    while((podatki = video(sporocilo.besedilo, indeks)) != undefined){
      indeks = podatki[1];
      console.log(podatki[0]);
      $('#sporocila').append($('<div></div>').html('<iframe src="https://www.youtube.com/embed/' + podatki[0] + '" allowfullscreen style="width:200px; height:150px; margin-left:20px"></iframe>'));
    }
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
  });
  
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var kanal in kanali) {
      kanal = kanal.substring(1, kanal.length);
      if (kanal != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanal));
      }
    }

    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });

  socket.on('uporabniki', function(uporabniki) {
    $('#seznam-uporabnikov').empty();
    for (var i=0; i < uporabniki.length; i++) {
      $('#seznam-uporabnikov').append(divElementEnostavniTekst(uporabniki[i]));
    }
  });

  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();

  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
  
  
});

function slika (besedilo, indeks){
  if(indeks >= besedilo.length) return;
  var podstring = besedilo.substring(indeks);
  var zacetek = Math.max(podstring.indexOf("http://") && podstring.indexOf("https://"));
  if(zacetek == -1) return;
  var podpodstring = podstring.substring(zacetek);
  var jpg = podpodstring.indexOf(".jpg");
  var gif = podpodstring.indexOf(".gif");
  var png = podpodstring.indexOf(".png");
  if(Math.max(jpg, gif, png) == -1)return;
  var konec = Math.max(jpg, gif, png);
  if(jpg > -1)konec = Math.min(konec, jpg);
  if(gif > -1)konec = Math.min(konec, gif);
  if(png > -1)konec = Math.min(konec, png);
  return [besedilo.substring(indeks+zacetek, indeks + zacetek + konec + 4), indeks + zacetek + konec + 4];
}

function video (besedilo, indeks){
  if(indeks >= besedilo.length) return;
  var podstring = besedilo.substring(indeks);
  var zacetek = podstring.indexOf("https://www.youtube.com/watch?v=");
  if(zacetek == -1) return;
  var podpodstring = podstring.substring(zacetek + "https://www.youtube.com/watch?v=".length);
  var presledek = podpodstring.indexOf(" ");
  if(presledek == -1)
    return [podpodstring, indeks + 30];
  else
    return [podpodstring.substring(0, presledek), indeks + zacetek + 30];
}


function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  }
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.replace(smesko,
      "<img src='http://sandbox.lavbic.net/teaching/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}
