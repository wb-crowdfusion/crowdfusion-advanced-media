CHANGES
-------

1.7.4
    * [ImagesCliController::loadNodeRefsWithMissingThumbs] Fix inefficient query for missing thumbs.  ticket #204


1.7.3
    * Enable throttling for the distributed thumbnail rebuild process. Ticket #105
        * [ImagesCliController] Added a more selective SQL query to replace the NodeQuery.
        * [ImagesCliController] Deprecated rebuildThumbnailsDistributed, call rebuildThumbnails with proper options.
        * [ImagesCliController] Rebuilt rebuildThumbnails to allow for throttling and max nodes option.
        * [ImageService] Made getUniqueThumbnailSizes method public.
        * [ImagesWorker] Setup rebuildThumbnails to allow for array of nodeRefs or single nodeRef.
    * Adding @wb-mixin-guid-random to elements defined in plugin.xml.  If wb-guid is enabled it will use it.

 -- jb.smith  12 Sep 2013


1.7.2
    * Ensure temporary files are being cleaned up.

 -- matt.surabian Thu 18 Oct 2012 15:57

1.7.1

    * removed &pack=true from ImageFilterTool asset in MediaAssetHandler::generateAsset as it was breaking the code
      (drag/drop of image files not working at all)

--andy.scholz 15 Aug 2012 14:30 NZST

1.7.0

    * Add support for tag-prepend behavior when a new image is uploaded.
    * Must be using framework v.2.13

 -- matt.surabian 11 July 2012 11:27 EDT

1.6.4

    * Reset instance variables on shutdown

 -- noel.bennett 28 May 2012 16:30 EDT

    * add fieldlike="true" to all tag definitions

 -- ryan.scheuermann 3 Jun 2012 22:00 EDT

1.6.3

    * MediaEditCMSBuilder: set RemoveTagNonce and UpdateTagsNonce on the tagwidget for both non-fieldlike
      schemas and galleries, to restore gallery image reordering when used with crowdfusion-photo-gallery 1.1.3+.
      #gallery-images are defined as fieldlike as of crowdfusion-photo-gallery 1.1.3.

  -- clay.hinson 9 May 2012 15:00 EDT

1.6.2

    * in HTML5Uploader.js, the file's mimetype was being checked before the extension, causing the element type
      to be incorrectly set to "application" for swf files, thereby not allowing them to be uploaded. The
      logic was switched to now check the extension map first, and always fallback to the default case if no
      element is found for the extension or the mimetype.

-- elliot.betancourt  Tue, 27 Mar 2012, 17:01 ET

1.6.1

    * Update Bulkrebuild/bulkrebuildforce CmsControllers to use new methods instead of deprecated methods.
    * Fixed issue where when an image was uploaded by URL multiple thumbnail creation processes
      were kicked off causing broken cms size thumbnails.

 -- eric.byers 20 Mar 2012 16:00 CDT

1.6.0

    * Fixed: set z-index on media upload dialog inputs to allow text entry

 -- clay.hinson 16 Mar 2012 14:30 EDT

    * Fixing errors in js files that appear when asset aggregator compresses them.
 -- raul.reynoso Fri, 2 Mar 4:30 ET

    * MediaGalleryTagWidget.js: scroll app-content when dragging thumbnails during Reorder

 -- clay.hinson Mon, 20 Feb 15:30 EST

    * In AbstractMediaService::storeMedia if $desiredFilename does not have an extension, add the defaulkt
      extension on to it.
    * Add processAddHandler to shared context to allow thumbnails to be created in all contexts.
      Web context unbinds that event, and adds a special one that will generate thumbnails immediately.
    * Converted ImageWorker to use new rebuildMissingThumbnails method

 -- eric.byers Wed, 15 Feb 2012 17:00 CST

    * trim trailing spaces, newlines and carriage returns from thumbnail size parameters.

-- elliot.betancourt  Tue, 14 Feb 2012, 18:29 ET

    * merged 1.5.1 patch changes

 -- clay.hinson Tue, 14 Feb 2012, 09:15 EST

    * create jpeg thumbnails for png images based on config property.

 -- noel.bennett  Fri, 10 Feb 2012, 14:35 EST

1.5.1

    * jquery.fileupload.js: workaround for Chrome 17's removal of 'ProgressEvent.initProgressEvent'

  -- clay.hinson Tue, 14 Feb 2012 00:15 EST

    * HTML5Upload.js: fix for Firefox-specific issue causing the xhr object to lose context when accessed after setTimeout().
    This resolves an error dialog containing 'resp is null' after successfully uploading files.

  -- clay.hinson Mon, 13 Feb 2012 16:30 EST

1.5.0

    * Method ImageService::rebuildThumbnails is now marked as deprecated, please use ImageService::rebuildMissingThumbnails
      or ImageService::forceRebuildThumbnails depending on your requirements.

 -- elliot.betancourt  Wed, 8 Feb 2012, 13:07 ET

    * ImageService::rebuildThumbnails - When forceRebuild is false, rebuildThumbnails will no longer be destructive.
      It will rebuild all missing thumbnails from the config properties list, and leave all other images there.
    * Add ImageService.rebuildthumbnails.forcerebuild.post event trigger, to allow other classes to hook in and add the data

 -- eric.byers Fri, 3 Feb 2012 17:00 CST

    * MediaAddWidget: explicitly define UUID for identifying widget

 -- clay.hinson Tue, 31 Jan 2012 12:00 EST

    * Build thumbnails (other than default CMS size) asynchronously on QuickAdd/upload
    * MediaLibraryTagWidget: Support for asynchronously built thumbnails - Poll for available thumbs

 -- michele.ong Mon, 30 Jan 2012 09:42 AU-WST

1.4.7

    * IFT: Tweak to Add Filter button styles for visibility
    * IFT: Visual Crop filter (committed, disabled for review)
    * IFT: Filters now use color pickers where applicable
    * IFT: MediaService now fetches the correct StorageFacility info when adding/replacing thumbnails

  -- michele.ong Fri, 20 Jan 2012 17:21 AU-WST

    * Abstract out HTML5 upload functionality out of Media*TagWidget and FileTagWidget

  -- michele.ong Wed, 5 Jan 2012 18:32 AU-WST

1.4.6

    * file.type checking on Media*TagWidgets now also checks if the mimetype is empty string in addition to null
    * Add ESC to close the ImageFilterTool
    * MediaApiController::get now able to return non-media nodes

  -- michele.ong Wed, 21 Dec 2011 11:29 AU-WST

    * Adding support for Options.PostParams in FileTagWidget to allow overrides and additional post parameters
    * Media*TagWidget needs to store url of original media in TagLinkNode
    * MediaApiController now returns original media url for non-image media
    * MediaTagWidget should not attempt to open ImageFilterTool for non-image media

  -- michele.ong Tue, 20 Dec 2011 14:09 AU-WST

    * Change MediaService.addFileNode() to public

  -- rus.werner Tue, 20 Dec 2011 13:16 NZDT

    * FileTagWidget is no longer modal

  -- michele.ong Fri, 16 Dec 2011 17:23 AU-WST

1.4.5

    * Fix typo in FileTagWidget upload from url
    * FileTagWidget no longer prompts for title

  -- michele.ong Wed, 14 Dec 2011 07:30 AU-WST

    * Fix bug when clicking OK on ImageFilterTool:replaceThumbnail without dragging image first

  -- rus.werner Wed, 14 Dec 2011 08:41 NZDT

    * Fix typo in FileTagWidget upload from url

  -- rus.werner Wed, 14 Dec 2011 08:24 NZDT

    * Fix FileTagWidget upload extension verification bug

  -- rus.werner Tue, 13 Dec 2011 14:49 NZDT

    * Upload by URL now displays upload preview popup after the initial URL prompt for
      Media*TagWidget (excluding MediaAdd, which already does this)
    * Fix broken progress bar for upload by URL
    * Fix MediaLibraryTagWidget thumbnail title rendering undefined dimensions for non-
      image media
    * Fix filetype checking for uploads, upload correctly exits when file being uploaded
      is not a known/accepted type
    * No longer attempts to (re)build thumbnails for files which are not images

  -- michele.ong Mon, 12 Dec 2011 16:28 AU-WST

    * Fix JavaScript prompt() bug introduced in Safari 5.1
    * Fix tag status display on MediaLibraryTagWidget when quick adding

  -- rus.werner Mon, 12 Dec 2011 15:49 NZDT

    * Refactoring cleanup
        - changed media widget xmod option from "default-quickadd-element" to "default-quick-add-element"
        - removed all references of swfupload
        - removed media api test files
        - removed QuickAddAspect widget param; use QuickAddElement
        - added DefaultQuickAddElement (used to pre-select element dropdown during upload)

  -- rus.werner Mon, 12 Dec 2011 15:45 NZDT

    * Update FileTagWidget to use HTML5 upload instead of Flash (same as the Media*TagWidgets)
    * Upload by URL: Improved test for file extension
    * Upload by URL: No longer attempts to generate thumbnails for non-@images nodes
    * Media*TagWidget: MediaAspect now called QuickAddAspect
    * Media*TagWidget: QuickAddAspect defaults to 'media' as before, but if QuickAddElement is set, this will take precedence
    * Media*TagWidget: Mistakenly had AllowQuickAdd defaulting to true. It should never be true and should be overridden at instantiation
        Any #roles which require quickadd should have that defined in the aspect.
        Note: Does not apply to MediaAddWidget

 -- michele.ong Wed, 7 Dec 2011 13:21 WST

1.4.4

    * AbstractMediaService::storeMedia when using parameter $desiredFilename without an extension,
      no longer truncates filename.

 -- eric.byers Fri, 2 Dec 2011 14:30 CST

    * Re-add missing tag widget options for FileTagWidget: button_image_url, flash_url, FileSizeLimit

 -- rus.werner Tue, 6 Dec 2011 08:40 NZDT

1.4.3

    * Support base64 encoded "DataURL" in processQuickAdd()

 -- rus.werner Fri, 2 Dec 2011 11:04 NZDT

    * Fix "Upload From URL"

 -- noel.bennett Tue, 23 Nov 2011 12:20 EST

    * MediaTagWidget quick-adds were failing when quick-add-element is single element.

 -- noel.bennett Tue, 23 Nov 2011 12:10 EST


1.4.2

    * normal TagWidgets fail to quick-add when using the MediaEditCmsBuilder in the same xmod
    * PrimaryTagWidget's fail to use the correct nonce and urls

 -- ryan.scheuermann  Tue, 22 Nov 2011 20:40 EST

1.4.1

    * Send multiple NodeRefs to each gearman worker in MediaCliController::syncJsonThumbnailsDistributed
    * Create gearman jobs as 'low' priority in MediaCliController::syncJsonThumbnailsDistributed

-- alex.johnson Tue, 15 Nov 2011 10:00 PST


1.4.0

    * added aspect parameter to MediaCliController::syncJsonThumbnailsDistributed
    * split queries into batches for each element if aspect specified
    * added simple timer

-- andy.scholz Sun, 13 Nov 2011 16:30 NZST

    * Config property media.thumbnail.sizes is deprecated in favor of images.thumbnail.sizes
    * new media tools
    * JSON thumbnails support (syncs #thumbnails tags with json meta field)

 -- rus.werner  Tue, 10 May 2011 15:35 NZT

1.3.5
    * Make default quickadd element customisable in MediaLibraryTagWidget

 -- michele.ong Tue, 2 Aug 2011 13:32 AUWST

    * Set the default quickadd element to image in the mixin-media-library-edit.xmod

 -- michele.ong Mon, 15 Aug 2011 10:30 AUWST

1.3.4

    * Add quicktime audio player mode (the default) to MediaEditCmsBuilder for <audioplayer>

 -- rus.werner  Wed, 20 Jul 2011 10:59 NZST

1.3.3

    * Cli for migrating tags #primary-media to #primary-images (crowdfusion-media)

 -- noel.bennett  Tue, 28 Jun 2011 14:40 EDT


1.3.2

    * Add ability to pass a preconfigured StorageFacilityFile to FileService and the media service classes

 -- ryan.scheuermann  Wed, 15 Jun 2011 13:45 EDT

1.3.1

    * Add missing semi-colon to MediaTagWidget to allow for JS compression

 -- rus.werner Thu, 9 June 2011 09:21 EDT


1.3.0

    * FileService::renameFile() returns false if file is not found

 -- noel.bennett  Mon, 16 May 2011 09:45 EDT


1.2.1

    * strip utf8 characters from uploaded filenames to prevent
      escape_shell_arg() from breaking

 -- noel  Mon, 25 Apr 2011 18:25 EDT

1.2.0

    * added utility class for handling files to large to fit in memory
    * added class for parsing photoshop metadata

 -- noel  Fri, 25 Mar 2011 15:15 EDT

1.0.1

    * fix upload of avatars with spaces in the filenames

 -- ryan  Fri, 4 Mar 2011 09:38 EST


1.0.0

    * initial versioned commit

 -- rus  Fri, 4 Feb 2011 16:15 EST




UPGRADING FROM crowdfusion-media
--------------------------------

* @media aspect now refers to all types of media
* @mixin-load-media-tags is now @mixin-load-image-tags
* any classes currently using MediaService should be migrated to use ImageService instead
* will create the following elements if they don't exist: image, video, document, audio
