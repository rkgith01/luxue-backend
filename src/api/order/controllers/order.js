("use strict");

// @ts-ignore
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * order controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    // @ts-ignore
    const { products } = ctx.request.body;
    // @ts-ignore
    // console.log(ctx.request.body)
    const lineItems = await Promise.all(
      products.map(async (product) => {
        const itemDetails = await strapi
          .service("api::product.product")
          .findOne(product.id);

        // const images = product.img
        // console.log(product.img)
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: itemDetails.title,
              // description: itemDetails.desc,
              images: [product?.img],
            },
            unit_amount: Math.round(itemDetails.price * 100),
          },
          quantity: product.quantity,
        };
      })
    );

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        // success_url: `${process.env.CLIENT_URL}?success=true`,
        // cancel_url: `${process.env.CLIENT_URL}/?success=false`,
        success_url: process.env.CLIENT_URL + `/success`,
        cancel_url: process.env.CLIENT_URL + "/failed",
        line_items: lineItems,
        shipping_address_collection: {
          allowed_countries: ["US", "CA", "IN"],
        },
      });
      // console.log(session)
      await strapi.service("api::order.order").create({
        data: {
          products,
          stripeId: session.id,
        },
      });
      return { stripeSession: session };
    } catch (err) {
      ctx.response.status = 500;
      return { error: err.message };
    }
  },
}));
