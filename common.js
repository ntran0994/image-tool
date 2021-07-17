var PIXELATE_FILTER_DEFAULT_VALUE = 20;
var supportingFileAPI = !!(window.File && window.FileList && window.FileReader);
var rImageType = /data:(image\/.+);base64,/;
var shapeOptions = {};
var shapeType;
var activeObjectId;
var arrImg = []; // {idx, data}
var imageDataIdxSelected;

// Buttons
var $btns = $('.menu-item');
var $btnsActivatable = $btns.filter('.activatable');
var $inputImage = $('#input-image-file');
var $btnDownload = $('#btn-download');

var $btnUndo = $('#btn-undo');
var $btnRedo = $('#btn-redo');
var $btnClearObjects = $('#btn-clear-objects');
var $btnRemoveActiveObject = $('#btn-remove-active-object');
var $btnCrop = $('#btn-crop');
var $btnDrawLine = $('#btn-draw-line');
var $btnDrawShape = $('#btn-draw-shape');
var $btnApplyCrop = $('#btn-apply-crop');
var $btnCancelCrop = $('#btn-cancel-crop');
var $btnText = $('#btn-text');
var $btnTextStyle = $('.btn-text-style');
// var $btnAddIcon = $('#btn-add-icon');
// var $btnRegisterIcon = $('#btn-register-icon');
var $btnClose = $('.close');

// Input etc.
var $inputRotationRange = $('#input-rotation-range');
var $inputBrushWidthRange = $('#input-brush-width-range');
var $inputFontSizeRange = $('#input-font-size-range');
var $inputStrokeWidthRange = $('#input-stroke-width-range');
var $inputCheckTransparent = $('#input-check-transparent');
var $inputCheckFilter = $('#input-check-filter');

// Sub menus
var $displayingSubMenu = $();
var $cropSubMenu = $('#crop-sub-menu');
var $freeDrawingSubMenu = $('#free-drawing-sub-menu');
var $drawLineSubMenu = $('#draw-line-sub-menu');
var $drawShapeSubMenu = $('#draw-shape-sub-menu');
var $textSubMenu = $('#text-sub-menu');
// var $iconSubMenu = $('#icon-sub-menu');
var $imageFilterSubMenu = $('#image-filter-sub-menu');

// Select line type
var $selectLine = $('[name="select-line-type"]');

// Select shape type
var $selectShapeType = $('[name="select-shape-type"]');

// Select color of shape type
var $selectColorType = $('[name="select-color-type"]');

// Select blend type
var $selectBlendType = $('[name="select-blend-type"]');

// Image editor
var imageEditor = new tui.ImageEditor('.tui-image-editor', {
  cssMaxWidth: 700,
  cssMaxHeight: 500,
  selectionStyle: {
    cornerSize: 20,
    rotatingPointOffset: 70,
  },
});

// Color picker for free drawing
var brushColorpicker = tui.colorPicker.create({
  container: $('#tui-brush-color-picker')[0],
  color: '#000000',
});

// Color picker for text palette
var textColorpicker = tui.colorPicker.create({
  container: $('#tui-text-color-picker')[0],
  color: '#000000',
});

// Color picker for shape
var shapeColorpicker = tui.colorPicker.create({
  container: $('#tui-shape-color-picker')[0],
  color: '#000000',
});

// Color picker for icon
// var iconColorpicker = tui.colorPicker.create({
//   container: $('#tui-icon-color-picker')[0],
//   color: '#000000',
// });

// Common global functions
// HEX to RGBA
function hexToRGBa(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  var a = alpha || 1;

  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

function base64ToBlob(data) {
  var mimeString = '';
  var raw, uInt8Array, i, rawLength;

  raw = data.replace(rImageType, function (header, imageType) {
    mimeString = imageType;

    return '';
  });

  raw = atob(raw);
  rawLength = raw.length;
  uInt8Array = new Uint8Array(rawLength); // eslint-disable-line

  for (i = 0; i < rawLength; i += 1) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: mimeString });
}

function resizeEditor() {
  var $editor = $('.tui-image-editor');
  var $container = $('.tui-image-editor-canvas-container');
  var height = parseFloat($container.css('max-height'));

  $editor.height("100%");
}

function getBrushSettings() {
  var brushWidth = parseInt($inputBrushWidthRange.val(), 10);
  var brushColor = brushColorpicker.getColor();

  return {
    width: brushWidth,
    color: hexToRGBa(brushColor, 0.5),
  };
}

function activateShapeMode() {
  if (imageEditor.getDrawingMode() !== 'SHAPE') {
    imageEditor.stopDrawingMode();
    imageEditor.startDrawingMode('SHAPE');
  }
}

// function activateIconMode() {
//   imageEditor.stopDrawingMode();
// }

function activateTextMode() {
  if (imageEditor.getDrawingMode() !== 'TEXT') {
    imageEditor.stopDrawingMode();
    imageEditor.startDrawingMode('TEXT');
  }
}

function setTextToolbar(obj) {
  var fontSize = obj.fontSize;
  var fontColor = obj.fill;

  $inputFontSizeRange.val(fontSize);
  textColorpicker.setColor(fontColor);
}

// function setIconToolbar(obj) {
//   var iconColor = obj.fill;

//   iconColorpicker.setColor(iconColor);
// }

function setShapeToolbar(obj) {
  var fillColor, isTransparent, isFilter;
  var colorType = $selectColorType.val();
  var changeValue = colorType === 'stroke' ? obj.stroke : obj.fill.type;
  isTransparent = changeValue === 'transparent';
  isFilter = changeValue === 'filter';

  if (colorType === 'stroke') {
    if (!isTransparent && !isFilter) {
      shapeColorpicker.setColor(changeValue);
    }
  } else if (colorType === 'fill') {
    if (!isTransparent && !isFilter) {
      fillColor = obj.fill.color;
      shapeColorpicker.setColor(fillColor);
    }
  }

  $inputCheckTransparent.prop('checked', isTransparent);
  $inputCheckFilter.prop('checked', isFilter);
  $inputStrokeWidthRange.val(obj.strokeWidth);
}

function showSubMenu(type) {
  var $submenu;

  switch (type) {
    case 'shape':
      $submenu = $drawShapeSubMenu;
      break;
    case 'icon':
      $submenu = $iconSubMenu;
      break;
    case 'text':
      $submenu = $textSubMenu;
      break;
    default:
      $submenu = 0;
  }

  $displayingSubMenu.hide();
  $displayingSubMenu = $submenu.show();
}

function applyOrRemoveFilter(applying, type, options) {
  if (applying) {
    imageEditor.applyFilter(type, options).then(function (result) {
      console.log(result);
    });
  } else {
    imageEditor.removeFilter(type);
  }
}

// Attach image editor custom events
imageEditor.on({
  objectAdded: function (objectProps) {
    console.info(objectProps);
  },
  undoStackChanged: function (length) {
    if (length) {
      $btnUndo.removeClass('disabled');
    } else {
      $btnUndo.addClass('disabled');
    }
    resizeEditor();
  },
  redoStackChanged: function (length) {
    if (length) {
      $btnRedo.removeClass('disabled');
    } else {
      $btnRedo.addClass('disabled');
    }
    resizeEditor();
  },
  objectScaled: function (obj) {
    if (obj.type === 'text') {
      $inputFontSizeRange.val(obj.fontSize);
    }
  },
  addText: function (pos) {
    imageEditor
      .addText('Double Click', {
        position: pos.originPosition,
      })
      .then(function (objectProps) {
        console.log(objectProps);
      });
  },
  objectActivated: function (obj) {
    activeObjectId = obj.id;
    if (obj.type === 'rect' || obj.type === 'circle' || obj.type === 'triangle') {
      showSubMenu('shape');
      setShapeToolbar(obj);
      activateShapeMode();
    } else if (obj.type === 'icon') {
      showSubMenu('icon');
      setIconToolbar(obj);
      activateIconMode();
    } else if (obj.type === 'text') {
      showSubMenu('text');
      setTextToolbar(obj);
      activateTextMode();
    }
  },
  mousedown: function (event, originPointer) {
    if ($imageFilterSubMenu.is(':visible') && imageEditor.hasFilter('colorFilter')) {
      imageEditor.applyFilter('colorFilter', {
        x: parseInt(originPointer.x, 10),
        y: parseInt(originPointer.y, 10),
      });
    }
  },
});

// Attach button click event listeners
$btns.on('click', function () {
  $btnsActivatable.removeClass('active');
});

$btnsActivatable.on('click', function () {
  $(this).addClass('active');
});

$btnUndo.on('click', function () {
  $displayingSubMenu.hide();

  if (!$(this).hasClass('disabled')) {
    imageEditor.discardSelection();
    imageEditor.undo();
  }
});

$btnRedo.on('click', function () {
  $displayingSubMenu.hide();

  if (!$(this).hasClass('disabled')) {
    imageEditor.discardSelection();
    imageEditor.redo();
  }
});

$btnClearObjects.on('click', function () {
  $displayingSubMenu.hide();
  imageEditor.clearObjects();
});

$btnCrop.on('click', function () {
  imageEditor.startDrawingMode('CROPPER');
  $displayingSubMenu.hide();
  $displayingSubMenu = $cropSubMenu.show();
});

$btnClose.on('click', function () {
  imageEditor.stopDrawingMode();
  $displayingSubMenu.hide();
});

$btnApplyCrop.on('click', function () {
  imageEditor.crop(imageEditor.getCropzoneRect()).then(function () {
    imageEditor.stopDrawingMode();
    resizeEditor();
  });
});

$btnCancelCrop.on('click', function () {
  imageEditor.stopDrawingMode();
});

$inputBrushWidthRange.on('change', function () {
  imageEditor.setBrush({ width: parseInt(this.value, 10) });
});

$inputImage.on('change', function (event) {
  var file;

  if (!supportingFileAPI) {
    alert('This browser does not support file-api');
  }

  file = event.target.files[0];
  imageEditor.loadImageFromFile(file).then(function (result) {
    imageEditor.clearUndoStack();
  });

  const reader = new FileReader();
  reader.onload = (event) => {
    arrImg.push({
      idx: arrImg.length,
      data: event.target.result
    });
    loadListImage();
    imageDataIdxSelected = arrImg.length - 1;
  };
  reader.readAsDataURL(file);
});

$btnDownload.on('click', function () {
  var dataURL = imageEditor.toDataURL();

  if (dataURL !== arrImg[imageDataIdxSelected].data) {
    var confirmSaveChange = confirm("Do you want to save?");

    if (confirmSaveChange == true) {
      // Save current image before change image
      arrImg[imageDataIdxSelected].data = dataURL;

      loadListImage();
    } else {
      return;
    }
  }
});

// control draw line mode
$btnDrawLine.on('click', function () {
  imageEditor.stopDrawingMode();
  $displayingSubMenu.hide();
  $displayingSubMenu = $drawLineSubMenu.show();
  $selectLine.eq(0).change();
});

$selectLine.on('change', function () {
  var mode = $(this).val();
  var settings = getBrushSettings();

  imageEditor.stopDrawingMode();
  if (mode === 'freeDrawing') {
    imageEditor.startDrawingMode('FREE_DRAWING', settings);
  } else {
    imageEditor.startDrawingMode('LINE_DRAWING', settings);
  }
});

brushColorpicker.on('selectColor', function (event) {
  imageEditor.setBrush({
    color: hexToRGBa(event.color, 0.5),
  });
});

// control draw shape mode
$btnDrawShape.on('click', function () {
  showSubMenu('shape');

  // step 1. get options to draw shape from toolbar
  shapeType = $('[name="select-shape-type"]:checked').val();

  shapeOptions.stroke = '#000000';
  shapeOptions.fill = '#ffffff';

  shapeOptions.strokeWidth = Number($inputStrokeWidthRange.val());

  // step 2. set options to draw shape
  imageEditor.setDrawingShape(shapeType, shapeOptions);

  // step 3. start drawing shape mode
  activateShapeMode();
});

$selectShapeType.on('change', function () {
  shapeType = $(this).val();

  imageEditor.setDrawingShape(shapeType);
});
$selectColorType.on('change', function () {
  var colorType = $(this).val();
  if (colorType === 'stroke') {
    $inputCheckFilter.prop('disabled', true);
    $inputCheckFilter.prop('checked', false);
  } else {
    $inputCheckTransparent.prop('disabled', false);
    $inputCheckFilter.prop('disabled', false);
  }
});

$inputCheckTransparent.on('change', onChangeShapeFill);
$inputCheckFilter.on('change', onChangeShapeFill);
shapeColorpicker.on('selectColor', function (event) {
  $inputCheckTransparent.prop('checked', false);
  $inputCheckFilter.prop('checked', false);
  onChangeShapeFill(event);
});

function onChangeShapeFill(event) {
  var colorType = $selectColorType.val();
  var isTransparent = $inputCheckTransparent.prop('checked');
  var isFilter = $inputCheckFilter.prop('checked');
  var shapeOption;

  if (event.color) {
    shapeOption = event.color;
  } else if (isTransparent) {
    shapeOption = 'transparent';
  } else if (isFilter) {
    shapeOption = {
      type: 'filter',
      filter: [{ pixelate: PIXELATE_FILTER_DEFAULT_VALUE }],
    };
  }

  if (colorType === 'stroke') {
    imageEditor.changeShape(activeObjectId, {
      stroke: shapeOption,
    });
  } else if (colorType === 'fill') {
    imageEditor.changeShape(activeObjectId, {
      fill: shapeOption,
    });
  }

  imageEditor.setDrawingShape(shapeType, shapeOptions);
}

$inputStrokeWidthRange.on('change', function () {
  var strokeWidth = Number($(this).val());

  imageEditor.changeShape(activeObjectId, {
    strokeWidth: strokeWidth,
  });

  imageEditor.setDrawingShape(shapeType, shapeOptions);
});

// control text mode
$btnText.on('click', function () {
  showSubMenu('text');
  activateTextMode();
});

$inputFontSizeRange.on('change', function () {
  imageEditor.changeTextStyle(activeObjectId, {
    fontSize: parseInt(this.value, 10),
  });
});

$btnTextStyle.on('click', function (e) {
  // eslint-disable-line
  var styleType = $(this).attr('data-style-type');
  var styleObj;

  e.stopPropagation();

  switch (styleType) {
    case 'b':
      styleObj = { fontWeight: 'bold' };
      break;
    case 'i':
      styleObj = { fontStyle: 'italic' };
      break;
    case 'u':
      styleObj = { underline: true };
      break;
    case 'l':
      styleObj = { textAlign: 'left' };
      break;
    case 'c':
      styleObj = { textAlign: 'center' };
      break;
    case 'r':
      styleObj = { textAlign: 'right' };
      break;
    default:
      styleObj = {};
  }

  imageEditor.changeTextStyle(activeObjectId, styleObj);
});

textColorpicker.on('selectColor', function (event) {
  imageEditor.changeTextStyle(activeObjectId, {
    fill: event.color,
  });
});

// control icon
// $btnAddIcon.on('click', function () {
//   showSubMenu('icon');
//   activateIconMode();
// });

// function onClickIconSubMenu(event) {
//   var element = event.target || event.srcElement;
//   var iconType = $(element).attr('data-icon-type');

//   imageEditor.once('mousedown', function (e, originPointer) {
//     imageEditor
//       .addIcon(iconType, {
//         left: originPointer.x,
//         top: originPointer.y,
//       })
//       .then(function (objectProps) {
//         // console.log(objectProps);
//       });
//   });
// }

// $btnRegisterIcon.on('click', function () {
//   $iconSubMenu
//     .find('.menu-item')
//     .eq(3)
//     .after('<li id="customArrow" class="menu-item icon-text" data-icon-type="customArrow">↑</li>');

//   imageEditor.registerIcons({
//     customArrow: 'M 60 0 L 120 60 H 90 L 75 45 V 180 H 45 V 45 L 30 60 H 0 Z',
//   });

//   $btnRegisterIcon.off('click');

//   $iconSubMenu.on('click', '#customArrow', onClickIconSubMenu);
// });

// $iconSubMenu.on('click', '.icon-text', onClickIconSubMenu);

// iconColorpicker.on('selectColor', function (event) {
//   imageEditor.changeIconColor(activeObjectId, event.color);
// });

function loadListImage() {
  const ulElement = document.getElementById('container-list-image-data');
  ulElement.innerHTML = '';

  for (let i = 0; i < arrImg.length; i++) {
    const liElement = document.createElement('li');
    liElement.setAttribute('class', 'list-group-item');

    liElement.addEventListener('click', (e) => {
      var dataURL = imageEditor.toDataURL();

      if (dataURL !== arrImg[imageDataIdxSelected].data) {
        var confirmSaveChange = confirm("Do you want to save?");

        if (confirmSaveChange == true) {
          // Save current image before change image
          arrImg[imageDataIdxSelected].data = dataURL;

          loadListImage();
        } else {
          return;
        }
      }

      imageDataIdxSelected = e.target.getAttribute('data-idx');

      const blob = base64ToBlob(arrImg[imageDataIdxSelected].data);

      const file = new File([blob], "Filename.png", { type: "image/png" })

      imageEditor.loadImageFromFile(file);
    });

    const imgElement = document.createElement('img');
    imgElement.setAttribute('src', arrImg[i].data);
    imgElement.setAttribute('class', 'image-item rounded');
    imgElement.setAttribute('data-idx', arrImg[i].idx);

    liElement.append(imgElement);

    ulElement.append(liElement);
  }
}