# CHANGELOG


## v1.7.6
* issue #3: Added ability to make images responsive (by adding class to <img> tag)


## v1.7.5
* Added drag-and-drop file support for EpicEditor


## v1.7.4
* [ImagesCliController::loadNodeRefsWithMissingThumbs] Fix inefficient query for missing thumbs.  ticket #204


## v1.7.3
* Enable throttling for the distributed thumbnail rebuild process. Ticket #105
* [ImagesCliController] Added a more selective SQL query to replace the NodeQuery.
* [ImagesCliController] Deprecated rebuildThumbnailsDistributed, call rebuildThumbnails with proper options.
* [ImagesCliController] Rebuilt rebuildThumbnails to allow for throttling and max nodes option.
* [ImageService] Made getUniqueThumbnailSizes method public.
* [ImagesWorker] Setup rebuildThumbnails to allow for array of nodeRefs or single nodeRef.
* Adding @wb-mixin-guid-random to elements defined in plugin.xml.  If wb-guid is enabled it will use it.


## v1.7.2
* Ensure temporary files are being cleaned up.


## v1.7.1
* removed &pack=true from ImageFilterTool asset in MediaAssetHandler::generateAsset as it was breaking the code
  (drag/drop of image files not working at all)


## v1.7.0
* Add support for tag-prepend behavior when a new image is uploaded.
* Must be using framework v.2.13


## v1.6.4
* Reset instance variables on shutdown
* add fieldlike="true" to all tag definitions


## v1.6.3
* MediaEditCMSBuilder: set RemoveTagNonce and UpdateTagsNonce on the tagwidget for both non-fieldlike
  schemas and galleries, to restore gallery image reordering when used with crowdfusion-photo-gallery 1.1.3+.
  #gallery-images are defined as fieldlike as of crowdfusion-photo-gallery 1.1.3.


## v1.6.2
* in HTML5Uploader.js, the file's mimetype was being checked before the extension, causing the element type
  to be incorrectly set to "application" for swf files, thereby not allowing them to be uploaded. The
  logic was switched to now check the extension map first, and always fallback to the default case if no
  element is found for the extension or the mimetype.


## v1.6.1
* Update Bulkrebuild/bulkrebuildforce CmsControllers to use new methods instead of deprecated methods.
* Fixed issue where when an image was uploaded by URL multiple thumbnail creation processes
  were kicked off causing broken cms size thumbnails.


## v1.6.0
* Fixed: set z-index on media upload dialog inputs to allow text entry
* Fixing errors in js files that appear when asset aggregator compresses them.
* MediaGalleryTagWidget.js: scroll app-content when dragging thumbnails during Reorder
* In AbstractMediaService::storeMedia if $desiredFilename does not have an extension, add the defaulkt
  extension on to it.
* Add processAddHandler to shared context to allow thumbnails to be created in all contexts.
  Web context unbinds that event, and adds a special one that will generate thumbnails immediately.
* Converted ImageWorker to use new rebuildMissingThumbnails method
* trim trailing spaces, newlines and carriage returns from thumbnail size parameters.
* merged 1.5.1 patch changes
* create jpeg thumbnails for png images based on config property.


## v1.5.1
* jquery.fileupload.js: workaround for Chrome 17's removal of 'ProgressEvent.initProgressEvent'
* HTML5Upload.js: fix for Firefox-specific issue causing the xhr object to lose context when accessed after setTimeout().
  This resolves an error dialog containing 'resp is null' after successfully uploading files.


## v1.5.0
* Method ImageService::rebuildThumbnails is now marked as deprecated, please use ImageService::rebuildMissingThumbnails
  or ImageService::forceRebuildThumbnails depending on your requirements.
* ImageService::rebuildThumbnails - When forceRebuild is false, rebuildThumbnails will no longer be destructive.
  It will rebuild all missing thumbnails from the config properties list, and leave all other images there.
* Add ImageService.rebuildthumbnails.forcerebuild.post event trigger, to allow other classes to hook in and add the data
* MediaAddWidget: explicitly define UUID for identifying widget
* Build thumbnails (other than default CMS size) asynchronously on QuickAdd/upload
* MediaLibraryTagWidget: Support for asynchronously built thumbnails - Poll for available thumbs


## v1.4.7
* IFT: Tweak to Add Filter button styles for visibility
* IFT: Visual Crop filter (committed, disabled for review)
* IFT: Filters now use color pickers where applicable
* IFT: MediaService now fetches the correct StorageFacility info when adding/replacing thumbnails
* Abstract out HTML5 upload functionality out of Media*TagWidget and FileTagWidget


## v1.4.6
* file.type checking on Media*TagWidgets now also checks if the mimetype is empty string in addition to null
* Add ESC to close the ImageFilterTool
* MediaApiController::get now able to return non-media nodes
* Adding support for Options.PostParams in FileTagWidget to allow overrides and additional post parameters
* Media*TagWidget needs to store url of original media in TagLinkNode
* MediaApiController now returns original media url for non-image media
* MediaTagWidget should not attempt to open ImageFilterTool for non-image media
* Change MediaService.addFileNode() to public
* FileTagWidget is no longer modal


## v1.4.5
* Fix typo in FileTagWidget upload from url
* FileTagWidget no longer prompts for title
* Fix bug when clicking OK on ImageFilterTool:replaceThumbnail without dragging image first
* Fix typo in FileTagWidget upload from url
* Fix FileTagWidget upload extension verification bug
* Upload by URL now displays upload preview popup after the initial URL prompt for
  Media*TagWidget (excluding MediaAdd, which already does this)
* Fix broken progress bar for upload by URL
* Fix MediaLibraryTagWidget thumbnail title rendering undefined dimensions for non-
  image media
* Fix filetype checking for uploads, upload correctly exits when file being uploaded
  is not a known/accepted type
* No longer attempts to (re)build thumbnails for files which are not images
* Fix JavaScript prompt() bug introduced in Safari 5.1
* Fix tag status display on MediaLibraryTagWidget when quick adding
* Refactoring cleanup
  - changed media widget xmod option from "default-quickadd-element" to "default-quick-add-element"
  - removed all references of swfupload
  - removed media api test files
  - removed QuickAddAspect widget param; use QuickAddElement
  - added DefaultQuickAddElement (used to pre-select element dropdown during upload)
* Update FileTagWidget to use HTML5 upload instead of Flash (same as the Media*TagWidgets)
* Upload by URL: Improved test for file extension
* Upload by URL: No longer attempts to generate thumbnails for non-@images nodes
* Media*TagWidget: MediaAspect now called QuickAddAspect
* Media*TagWidget: QuickAddAspect defaults to 'media' as before, but if QuickAddElement is set, this will take precedence
* Media*TagWidget: Mistakenly had AllowQuickAdd defaulting to true. It should never be true and should be overridden at instantiation
  Any #roles which require quickadd should have that defined in the aspect.
  Note: Does not apply to MediaAddWidget


## v1.4.4
* AbstractMediaService::storeMedia when using parameter $desiredFilename without an extension,
  no longer truncates filename.
* Re-add missing tag widget options for FileTagWidget: button_image_url, flash_url, FileSizeLimit


## v1.4.3
* Support base64 encoded "DataURL" in processQuickAdd()
* Fix "Upload From URL"
* MediaTagWidget quick-adds were failing when quick-add-element is single element.


## v1.4.2
* normal TagWidgets fail to quick-add when using the MediaEditCmsBuilder in the same xmod
* PrimaryTagWidget's fail to use the correct nonce and urls


## v1.4.1
* Send multiple NodeRefs to each gearman worker in MediaCliController::syncJsonThumbnailsDistributed
* Create gearman jobs as 'low' priority in MediaCliController::syncJsonThumbnailsDistributed


## v1.4.0
* added aspect parameter to MediaCliController::syncJsonThumbnailsDistributed
* split queries into batches for each element if aspect specified
* added simple timer
* Config property media.thumbnail.sizes is deprecated in favor of images.thumbnail.sizes
* new media tools
* JSON thumbnails support (syncs #thumbnails tags with json meta field)


## v1.3.5
* Make default quickadd element customisable in MediaLibraryTagWidget
* Set the default quickadd element to image in the mixin-media-library-edit.xmod


## v1.3.4
* Add quicktime audio player mode (the default) to MediaEditCmsBuilder for <audioplayer>


## v1.3.3
* Cli for migrating tags #primary-media to #primary-images (crowdfusion-media)


## v1.3.2
* Add ability to pass a preconfigured StorageFacilityFile to FileService and the media service classes


## v1.3.1
* Add missing semi-colon to MediaTagWidget to allow for JS compression


## v1.3.0
* FileService::renameFile() returns false if file is not found


## v1.2.1
* strip utf8 characters from uploaded filenames to prevent
  escape_shell_arg() from breaking

## v1.2.0
* added utility class for handling files to large to fit in memory
* added class for parsing photoshop metadata


## v1.0.1
* fix upload of avatars with spaces in the filenames


## v1.0.0
* initial versioned commit




# UPGRADING FROM crowdfusion-media

* @media aspect now refers to all types of media
* @mixin-load-media-tags is now @mixin-load-image-tags
* any classes currently using MediaService should be migrated to use ImageService instead
* will create the following elements if they don't exist: image, video, document, audio
