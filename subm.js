const handleSubmit = () => {
    const data = {
      name: bundleName,
      title: title,
      resource: products,
      displayVariantImage: displayVariantImage,
      checkedVariantImage: checkedVariantImage,
      variantSize: variantSize,
      variantBorder: variantBorder,
      displayComparePrice: displayComparePrice,
      colors: colors,
      sizes: sizes,
      weights: weights,
      ATCbuttonValue: ATCbuttonValue,
      ATCButtonPadding: ATCButtonPadding,
      ATCButtonBorderRadius: ATCButtonBorderRadius,
      horizantal: horizantal,
      offers: offers,
      giftSection: giftSection,
      freeGiftSection: showFreeGiftSec,
      horizantalGift: horizantalGift,
      productCards: productCards,
      activeIndexes: activeIndexes
    }
    const createdAt = formatFullDate(new Date());
    fetcher.submit(
      {
        name: bundleName,
        title: title,
        data: JSON.stringify(data),
        createdAt: createdAt,
        actionType: "create",

      },
      {
        method: "POST",
      }
    )
  }
